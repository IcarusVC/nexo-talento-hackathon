import { NextRequest, NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";
import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendCvEmail } from "@/lib/email";
import { CV_STATUSES } from "@/lib/constants";

// nodemailer + firebase-admin/firestore need the Node runtime (not Edge).
export const runtime = "nodejs";

/** Under Vercel's 4.5 MB request-body limit; the UI caps at the same value. */
const MAX_BYTES = 4 * 1024 * 1024;
/** Anti-spam: at most one CV submission per user per minute. */
const RATE_LIMIT_MS = 60_000;

/**
 * $0 CV intake — no Firebase Storage. The user's PDF is emailed to the owner's
 * inbox (the "sales funnel") and only lightweight metadata is written to
 * Firestore (status/version/history), never the bytes. The team emails the
 * improved CV back; the client-side approve/request-changes flow is unchanged.
 */
export async function POST(req: NextRequest) {
  // 1) Auth — trust only the uid inside the verified ID token.
  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Falta autenticación." }, { status: 401 });
  }

  let uid: string;
  let email: string;
  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? "sin-correo";
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  // 2) Read the uploaded file from multipart/form-data.
  let file: File | null = null;
  try {
    const form = await req.formData();
    const candidate = form.get("file");
    if (candidate instanceof File) file = candidate;
  } catch {
    return NextResponse.json({ error: "No pudimos leer el archivo." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  // 3) Validate: size, declared type, and the real %PDF magic bytes.
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 4 MB." }, { status: 413 });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const looksLikePdf =
    file.type === "application/pdf" && buffer.subarray(0, 4).toString("latin1") === "%PDF";
  if (!looksLikePdf) {
    return NextResponse.json({ error: "Solo se aceptan archivos PDF." }, { status: 415 });
  }

  const db = getAdminDb();
  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  const data = snap.data() ?? {};
  const cv = (data.cv ?? {}) as {
    version?: number;
    updatedAt?: { toMillis?: () => number };
    history?: unknown[];
  };
  const displayName = (data.displayName as string | null) ?? null;

  // 4) Rate-limit from SERVER-ONLY state. This used to read users/{uid}.cv.updatedAt,
  //    which the client can write itself (the users update rule pins role/wallet/status
  //    but nothing stopped a client from rewinding cv.updatedAt to 0 and immediately
  //    re-submitting, turning the throttle off and flooding the operator's single Gmail
  //    sender with 4 MB attachments). rateLimits/{uid} is denied to all clients in
  //    firestore.rules; only the Admin SDK (which bypasses rules) can touch it.
  //    Check-and-stamp run in one transaction so concurrent requests cannot both pass.
  const rlRef = db.doc(`rateLimits/${uid}`);
  const allowed = await db.runTransaction(async (tx: Transaction) => {
    const rl = await tx.get(rlRef);
    const lastMs = (rl.data()?.cvSubmitAt as Timestamp | undefined)?.toMillis?.() ?? 0;
    if (Date.now() - lastMs < RATE_LIMIT_MS) return false;
    tx.set(rlRef, { cvSubmitAt: FieldValue.serverTimestamp() }, { merge: true });
    return true;
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Espera un momento antes de enviar otro CV." },
      { status: 429 }
    );
  }

  const nextVersion = (cv.version ?? 0) + 1;

  // 5) Email FIRST — only mark the CV "received" if delivery actually worked.
  const to = process.env.OWNER_CV_INBOX || process.env.GMAIL_USER || "cv@turbotrabajo.local";
  let previewUrl: string | null = null;
  try {
    const result = await sendCvEmail({
      to,
      subject: `Nuevo CV — ${email} (uid ${uid})`,
      text: `Nuevo CV recibido en TurboTrabajo.

Correo: ${email}
Nombre: ${displayName ?? "—"}
UID: ${uid}
Versión: ${nextVersion}

El PDF va adjunto. Envía la versión mejorada al correo del candidato.`,
      attachment: { filename: `cv-${uid}-v${nextVersion}.pdf`, content: buffer },
    });
    previewUrl = result.previewUrl;
  } catch (err) {
    console.error("CV email send failed", err);
    return NextResponse.json(
      { error: "No pudimos enviar tu CV. Inténtalo de nuevo." },
      { status: 502 }
    );
  }

  // 6) Metadata only — no bytes in Firestore. Admin SDK bypasses client rules.
  try {
    await userRef.update({
      "cv.status": CV_STATUSES.PENDIENTE_MEJORA,
      "cv.version": nextVersion,
      "cv.originalPath": null,
      "cv.updatedAt": FieldValue.serverTimestamp(),
      "cv.clientNote": null,
      "cv.history": [
        ...(Array.isArray(cv.history) ? cv.history : []),
        { version: nextVersion, path: null, uploadedAt: Timestamp.now(), uploadedBy: "client" },
      ],
    });
  } catch (err) {
    // The email already went out; don't fail the user over a metadata write.
    console.error("CV metadata update failed after email sent", err);
    return NextResponse.json({ ok: true, warning: "metadata" });
  }

  return NextResponse.json({ ok: true, previewUrl });
}
