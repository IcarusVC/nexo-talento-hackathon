import { FieldValue, Timestamp, type Firestore } from "firebase-admin/firestore";
import {
  APPLICATION_STATUSES,
  CV_STATUSES,
  LEDGER_TYPES,
  type ApplicationStatus,
} from "@/lib/constants";

/**
 * Workstream C — server-authoritative token spend. One token per application:
 * reserved when the user opts in, settled (balance−1) when the team confirms
 * the submission ("enviada"), released back when it can't be sent
 * ("no_aplicable") or the user withdraws in time ("retirada").
 *
 * Ledger `amount` is the change in AVAILABLE tokens (balance − reserved):
 * reserve −1, settle 0 (the hold becomes a charge), release +1 — matching the
 * documented semantics on TokenLedgerEntry. Wallet movements only ever happen
 * inside Firestore transactions, and only for applications that actually hold
 * a token (`tokenReserved: true`); legacy applications created before this
 * workstream transition status without touching the wallet.
 */

export type WalletErrorCode =
  | "user_not_found"
  | "cv_not_approved"
  | "no_tokens"
  | "listing_not_found"
  | "duplicate"
  | "application_not_found"
  | "invalid_transition"
  | "forbidden";

export class WalletError extends Error {
  constructor(
    readonly code: WalletErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = "WalletError";
  }
}

export const WALLET_HTTP_STATUS: Record<WalletErrorCode, number> = {
  user_not_found: 404,
  cv_not_approved: 403,
  no_tokens: 402,
  listing_not_found: 404,
  duplicate: 409,
  application_not_found: 404,
  invalid_transition: 409,
  forbidden: 403,
};

export const WALLET_ERROR_MESSAGES: Record<WalletErrorCode, string> = {
  user_not_found: "No encontramos tu cuenta.",
  cv_not_approved: "Necesitas tener tu CV aprobado antes de postular.",
  no_tokens: "No te quedan tokens. Cada postulación usa 1 token.",
  listing_not_found: "Este empleo ya no está disponible.",
  duplicate: "Ya postulaste a este empleo.",
  application_not_found: "No encontramos esa postulación.",
  invalid_transition: "Esta postulación ya no puede cambiar a ese estado.",
  forbidden: "No puedes modificar esta postulación.",
};

/** Statuses each current status may move to (team side; client only "retirada"). */
const ALLOWED_TRANSITIONS: Partial<Record<ApplicationStatus, ApplicationStatus[]>> = {
  pendiente: ["enviada", "no_aplicable", "retirada"],
  enviada: ["en_entrevista", "rechazada", "oferta"],
  en_entrevista: ["rechazada", "oferta"],
};

interface WalletSnapshot {
  balance: number;
  reserved: number;
}

function readWallet(data: Record<string, unknown> | undefined): WalletSnapshot {
  const wallet = (data?.wallet ?? {}) as Partial<WalletSnapshot>;
  return { balance: wallet.balance ?? 0, reserved: wallet.reserved ?? 0 };
}

function ledgerEntry(
  type: (typeof LEDGER_TYPES)[keyof typeof LEDGER_TYPES],
  amount: number,
  balanceAfter: number,
  applicationId: string
) {
  return {
    type,
    amount,
    balanceAfter,
    flowOrder: null,
    applicationId,
    createdAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Opt-in: atomically create the application (deterministic id `uid_listingId`,
 * which doubles as the duplicate guard — same pattern as payments/{flowOrder})
 * and place a 1-token hold. Throws WalletError on every gate.
 */
export async function applyToListing(
  db: Firestore,
  { uid, listingId }: { uid: string; listingId: string }
): Promise<{ applicationId: string }> {
  const applicationId = `${uid}_${listingId}`;

  await db.runTransaction(async (tx) => {
    const userRef = db.doc(`users/${uid}`);
    const listingRef = db.doc(`listings/${listingId}`);
    const appRef = db.doc(`applications/${applicationId}`);

    // All reads first — Firestore transactions forbid reads after writes.
    const userSnap = await tx.get(userRef);
    const listingSnap = await tx.get(listingRef);
    const appSnap = await tx.get(appRef);

    if (!userSnap.exists) throw new WalletError("user_not_found");
    const user = userSnap.data() ?? {};
    const cv = (user.cv ?? {}) as { status?: string; version?: number };
    if (cv.status !== CV_STATUSES.APROBADO) throw new WalletError("cv_not_approved");

    const wallet = readWallet(user);
    if (wallet.balance - wallet.reserved < 1) throw new WalletError("no_tokens");

    if (!listingSnap.exists || listingSnap.data()?.active === false) {
      throw new WalletError("listing_not_found");
    }
    if (appSnap.exists) throw new WalletError("duplicate");

    const listing = listingSnap.data() ?? {};
    tx.set(appRef, {
      userId: uid,
      listingId,
      listingTitle: (listing.title as string) ?? "",
      company: (listing.company as string) ?? "",
      status: APPLICATION_STATUSES.PENDIENTE,
      // serverTimestamp() is not allowed inside arrays — use a concrete Timestamp.
      statusHistory: [{ status: APPLICATION_STATUSES.PENDIENTE, at: Timestamp.now() }],
      cvVersionUsed: cv.version ?? null,
      tokenReserved: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(userRef, { "wallet.reserved": wallet.reserved + 1 });
    tx.set(
      userRef.collection("tokenLedger").doc(),
      ledgerEntry(LEDGER_TYPES.RESERVE, -1, wallet.balance, applicationId)
    );
  });

  return { applicationId };
}

/**
 * Move an application through the status graph, settling or releasing its
 * token hold as a side effect. `requesterUid` marks a client call: it may
 * only withdraw ("retirada") its own application; omit it for team tooling.
 */
export async function transitionApplication(
  db: Firestore,
  {
    applicationId,
    nextStatus,
    requesterUid,
  }: { applicationId: string; nextStatus: ApplicationStatus; requesterUid?: string }
): Promise<void> {
  await db.runTransaction(async (tx) => {
    const appRef = db.doc(`applications/${applicationId}`);
    const appSnap = await tx.get(appRef);
    if (!appSnap.exists) throw new WalletError("application_not_found");
    const app = appSnap.data() ?? {};

    if (requesterUid !== undefined) {
      if (nextStatus !== APPLICATION_STATUSES.RETIRADA || app.userId !== requesterUid) {
        throw new WalletError("forbidden");
      }
    }

    const allowed = ALLOWED_TRANSITIONS[app.status as ApplicationStatus] ?? [];
    if (!allowed.includes(nextStatus)) throw new WalletError("invalid_transition");

    const holdsToken = app.tokenReserved === true;
    const settles = holdsToken && nextStatus === APPLICATION_STATUSES.ENVIADA;
    const releases =
      holdsToken &&
      (nextStatus === APPLICATION_STATUSES.NO_APLICABLE ||
        nextStatus === APPLICATION_STATUSES.RETIRADA);

    let userRef: ReturnType<Firestore["doc"]> | null = null;
    let wallet: WalletSnapshot = { balance: 0, reserved: 0 };
    if (settles || releases) {
      userRef = db.doc(`users/${app.userId}`);
      const userSnap = await tx.get(userRef);
      if (!userSnap.exists) throw new WalletError("user_not_found");
      wallet = readWallet(userSnap.data());
    }

    const history = Array.isArray(app.statusHistory) ? app.statusHistory : [];
    tx.update(appRef, {
      status: nextStatus,
      statusHistory: [...history, { status: nextStatus, at: Timestamp.now() }],
      updatedAt: FieldValue.serverTimestamp(),
      ...(settles || releases ? { tokenReserved: false } : {}),
    });

    if (settles && userRef) {
      tx.update(userRef, {
        "wallet.balance": wallet.balance - 1,
        "wallet.reserved": Math.max(wallet.reserved - 1, 0),
      });
      tx.set(
        userRef.collection("tokenLedger").doc(),
        ledgerEntry(LEDGER_TYPES.SETTLE, 0, wallet.balance - 1, applicationId)
      );
    }

    if (releases && userRef) {
      tx.update(userRef, { "wallet.reserved": Math.max(wallet.reserved - 1, 0) });
      tx.set(
        userRef.collection("tokenLedger").doc(),
        ledgerEntry(LEDGER_TYPES.RELEASE, 1, wallet.balance, applicationId)
      );
    }
  });
}
