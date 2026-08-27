import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { getAdminDb } from "@/lib/firebase-admin";
import { APPLICATION_STATUSES } from "@/lib/constants";
import {
  transitionApplication,
  WalletError,
  WALLET_ERROR_MESSAGES,
  WALLET_HTTP_STATUS,
} from "@/lib/wallet";

export const runtime = "nodejs";

/**
 * Client-side withdraw: only the owner, only while "pendiente", and it
 * releases the reserved token (transitionApplication enforces all three).
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Falta autenticación." }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await verifyFirebaseIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { applicationId?: unknown } | null;
  const applicationId = typeof body?.applicationId === "string" ? body.applicationId : null;
  // A "/" would turn applications/{id} into an invalid Firestore doc path.
  if (!applicationId || applicationId.includes("/")) {
    return NextResponse.json({ error: "Falta la postulación." }, { status: 400 });
  }

  try {
    await transitionApplication(getAdminDb(), {
      applicationId,
      nextStatus: APPLICATION_STATUSES.RETIRADA,
      requesterUid: uid,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json(
        { error: WALLET_ERROR_MESSAGES[error.code], code: error.code },
        { status: WALLET_HTTP_STATUS[error.code] }
      );
    }
    console.error("applications withdraw failed", error);
    return NextResponse.json(
      { error: "No pudimos retirar tu postulación. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
