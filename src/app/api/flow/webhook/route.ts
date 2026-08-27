import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { FLOW_PAYMENT_STATUS, getPaymentStatus } from "@/lib/flow";
import { LEDGER_TYPES, TOKEN_PACK } from "@/lib/constants";

/**
 * Flow calls this (urlConfirmation) by POSTing `token`. We re-fetch the payment
 * status from Flow's API (getStatus) rather than trusting the body, since Flow does
 * not sign the confirmation POST.
 *
 * On a PAID payment we credit `TOKEN_PACK.tokens` to the user's wallet and append a
 * `tokenLedger` entry, atomically. Idempotent: the payment is keyed by `flowOrder`
 * and a `credited` flag guards against Flow's webhook retries double-crediting.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const token = form.get("token")?.toString();

  if (!token) {
    return NextResponse.json({ error: "Falta token." }, { status: 400 });
  }

  const payment = await getPaymentStatus(token);
  const uid = payment.commerceOrder.split("-").slice(0, -1).join("-");

  if (!uid) {
    console.error("Flow webhook: could not parse uid from commerceOrder", payment.commerceOrder);
    return NextResponse.json({ error: "Orden inválida." }, { status: 400 });
  }

  const db = getAdminDb();
  const paymentRef = db.collection("payments").doc(String(payment.flowOrder));
  const userRef = db.doc(`users/${uid}`);

  try {
    await db.runTransaction(async (tx) => {
      const paymentSnap = await tx.get(paymentRef);
      if (paymentSnap.exists && paymentSnap.data()?.credited) {
        return; // already credited — Flow retry, no-op
      }

      const base = {
        userId: uid,
        flowOrder: String(payment.flowOrder),
        amount: payment.amount,
        status: String(payment.status),
        raw: payment as unknown as Record<string, unknown>,
        createdAt: paymentSnap.exists
          ? paymentSnap.data()?.createdAt ?? FieldValue.serverTimestamp()
          : FieldValue.serverTimestamp(),
      };

      if (payment.status !== FLOW_PAYMENT_STATUS.PAID) {
        tx.set(paymentRef, { ...base, credited: false }, { merge: true });
        return;
      }

      // Our server only ever creates orders for the fixed pack price, so a
      // paid amount that differs means the order didn't come from us (or the
      // price changed mid-flight). Flag it for manual review instead of
      // crediting; 200 below still acknowledges so Flow stops retrying.
      const expectedAmount = Number(process.env.FLOW_PLAN_AMOUNT ?? TOKEN_PACK.priceClp);
      if (payment.amount !== expectedAmount) {
        console.error(
          `Flow webhook: amount mismatch on order ${payment.flowOrder} — got ${payment.amount}, expected ${expectedAmount}; NOT crediting`
        );
        tx.set(paymentRef, { ...base, credited: false, amountMismatch: true }, { merge: true });
        return;
      }

      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) {
        throw new Error(`User ${uid} not found for paid order ${payment.flowOrder}`);
      }

      const currentBalance: number = userSnap.data()?.wallet?.balance ?? 0;
      const newBalance = currentBalance + TOKEN_PACK.tokens;

      tx.update(userRef, { "wallet.balance": newBalance });

      tx.set(userRef.collection("tokenLedger").doc(), {
        type: LEDGER_TYPES.PURCHASE,
        amount: TOKEN_PACK.tokens,
        balanceAfter: newBalance,
        flowOrder: String(payment.flowOrder),
        applicationId: null,
        createdAt: FieldValue.serverTimestamp(),
      });

      tx.set(
        paymentRef,
        { ...base, credited: true, tokensCredited: TOKEN_PACK.tokens },
        { merge: true }
      );
    });
  } catch (error) {
    console.error("Flow webhook: failed to credit tokens", error);
    return NextResponse.json({ error: "No pudimos acreditar los tokens." }, { status: 500 });
  }

  // Flow expects a 200 response to mark the confirmation as received.
  return NextResponse.json({ ok: true });
}
