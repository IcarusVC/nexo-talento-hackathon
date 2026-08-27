import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CV_STATUSES } from "@/lib/constants";
import type { ClientCv } from "@/lib/types";

/**
 * New accounts are created with `cv.status = pendiente_mejora` before any file
 * exists, so status alone can't distinguish "never uploaded" from "uploaded,
 * waiting on the team". UI that talks to the user must check this first.
 */
export function hasUploadedCv(cv: ClientCv): boolean {
  return cv.version > 0;
}

/**
 * Sends the CV PDF to the server route, which emails it to the team and writes
 * the metadata (status/version/history) with the Admin SDK. No Firebase Storage
 * is involved — see src/app/api/cv/submit/route.ts. Returns the dev-only email
 * preview URL when present (null in production).
 */
export async function submitCv(
  idToken: string,
  file: File
): Promise<{ previewUrl: string | null }> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/api/cv/submit", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
    body: form,
  });

  const data = (await res.json().catch(() => null)) as
    | { error?: string; previewUrl?: string | null }
    | null;

  if (!res.ok) {
    throw new Error(data?.error || "No pudimos enviar tu CV. Inténtalo de nuevo.");
  }
  return { previewUrl: data?.previewUrl ?? null };
}

export async function approveCv(uid: string) {
  await updateDoc(doc(db, "users", uid), {
    "cv.status": CV_STATUSES.APROBADO,
    "cv.updatedAt": serverTimestamp(),
  });
}

export async function requestCvChanges(uid: string, note: string) {
  await updateDoc(doc(db, "users", uid), {
    "cv.status": CV_STATUSES.CAMBIOS_SOLICITADOS,
    "cv.clientNote": note,
    "cv.updatedAt": serverTimestamp(),
  });
}
