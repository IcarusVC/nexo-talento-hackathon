import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CV_STATUSES } from "@/lib/constants";
import type { UserDoc } from "@/lib/types";

export interface OptInGate {
  allowed: boolean;
  reason?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

/** Opt-in requires at least one available token AND an approved CV on file. */
export function checkOptInGate(userDoc: UserDoc): OptInGate {
  const available = userDoc.wallet.balance - userDoc.wallet.reserved;
  if (available <= 0) {
    return {
      allowed: false,
      reason: "No te quedan tokens. Cada postulación usa 1 token.",
      ctaHref: "/tokens",
      ctaLabel: "Comprar tokens",
    };
  }
  if (userDoc.cv.status !== CV_STATUSES.APROBADO) {
    return {
      allowed: false,
      reason: "Necesitas tener tu CV aprobado antes de postular.",
      ctaHref: "/cv",
      ctaLabel: "Revisar mi CV",
    };
  }
  return { allowed: true };
}

/**
 * Best-effort duplicate pre-check for UX. The server route is the real guard
 * (deterministic `uid_listingId` doc id), but this query also covers legacy
 * applications created with auto-ids before the server-authoritative apply.
 */
export async function hasExistingApplication(userId: string, listingId: string): Promise<boolean> {
  const q = query(
    collection(db, "applications"),
    where("userId", "==", userId),
    where("listingId", "==", listingId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

/** Server error surfaced to the UI with its machine-readable code. */
export class ApplyError extends Error {
  constructor(
    readonly code: string | null,
    message: string
  ) {
    super(message);
    this.name = "ApplyError";
  }
}

async function postJson(
  path: string,
  idToken: string,
  body: Record<string, unknown>,
  fallbackMessage: string
): Promise<void> {
  const res = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (res.ok) return;
  const data = (await res.json().catch(() => null)) as
    | { error?: string; code?: string }
    | null;
  throw new ApplyError(data?.code ?? null, data?.error || fallbackMessage);
}

/**
 * Server-authoritative opt-in (Workstream C): the API route atomically creates
 * the application AND reserves 1 token. Clients no longer write `applications`
 * or `wallet` directly — firestore.rules deny it.
 */
export async function applyToListingViaServer(idToken: string, listingId: string): Promise<void> {
  await postJson(
    "/api/applications",
    idToken,
    { listingId },
    "No pudimos registrar tu postulación. Inténtalo de nuevo."
  );
}

/** Withdraw own pending application; the server releases the reserved token. */
export async function withdrawApplicationViaServer(
  idToken: string,
  applicationId: string
): Promise<void> {
  await postJson(
    "/api/applications/withdraw",
    idToken,
    { applicationId },
    "No pudimos retirar tu postulación. Inténtalo de nuevo."
  );
}
