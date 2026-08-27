import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { getAdminDb } from "@/lib/firebase-admin";
import {
  applyToListing,
  WalletError,
  WALLET_ERROR_MESSAGES,
  WALLET_HTTP_STATUS,
} from "@/lib/wallet";

export const runtime = "nodejs";

/**
 * Opt-in ("Participar"): server-authoritative apply. Reserves 1 token and
 * creates the application atomically — clients can no longer write
 * `applications` directly (see firestore.rules).
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

  const body = (await req.json().catch(() => null)) as { listingId?: unknown } | null;
  const listingId = typeof body?.listingId === "string" ? body.listingId : null;
  // A "/" would turn listings/{id} into an invalid Firestore doc path.
  if (!listingId || listingId.includes("/")) {
    return NextResponse.json({ error: "Falta el empleo a postular." }, { status: 400 });
  }

  try {
    const { applicationId } = await applyToListing(getAdminDb(), { uid, listingId });
    return NextResponse.json({ applicationId }, { status: 201 });
  } catch (error) {
    if (error instanceof WalletError) {
      return NextResponse.json(
        { error: WALLET_ERROR_MESSAGES[error.code], code: error.code },
        { status: WALLET_HTTP_STATUS[error.code] }
      );
    }
    console.error("applications POST failed", error);
    return NextResponse.json(
      { error: "No pudimos registrar tu postulación. Inténtalo de nuevo." },
      { status: 500 }
    );
  }
}
