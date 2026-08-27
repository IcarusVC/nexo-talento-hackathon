/**
 * Team-side CV workflow tool — run with:
 *   npx tsx scripts/cv-mark-improved.ts <uid>
 *
 * Marks a candidate's CV as "mejorado_por_revisar" (improved, awaiting the
 * candidate's in-app review). This is the manual step the team performs after
 * emailing the improved PDF back to the candidate; Firestore rules forbid
 * clients from setting this status themselves, so it must go through the
 * Admin SDK. Replaces hand-editing in the Firebase console until the operator
 * console (Workstream D) exists.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const VALID_PRIOR_STATUSES = ["pendiente_mejora", "cambios_solicitados"];

async function main() {
  const uid = process.argv[2];
  if (!uid) {
    console.error("Uso: npx tsx scripts/cv-mark-improved.ts <uid>");
    process.exit(1);
  }

  const { FieldValue } = await import("firebase-admin/firestore");
  const { getAdminDb } = await import("../src/lib/firebase-admin");
  const db = getAdminDb();

  const userRef = db.doc(`users/${uid}`);
  const snap = await userRef.get();
  if (!snap.exists) {
    console.error(`No existe users/${uid}`);
    process.exit(1);
  }

  const data = snap.data() ?? {};
  const cv = (data.cv ?? {}) as { status?: string; version?: number };
  console.log(
    `Usuario: ${data.displayName ?? "—"} <${data.email ?? "—"}>\n` +
      `CV actual: status=${cv.status}, version=${cv.version ?? 0}`
  );

  if ((cv.version ?? 0) < 1) {
    console.error("Este usuario aún no sube ningún CV — nada que marcar.");
    process.exit(1);
  }
  if (!VALID_PRIOR_STATUSES.includes(cv.status ?? "")) {
    console.error(
      `Transición inválida: solo se marca "mejorado_por_revisar" desde ` +
        `${VALID_PRIOR_STATUSES.join(" o ")} (estado actual: ${cv.status}).`
    );
    process.exit(1);
  }

  await userRef.update({
    "cv.status": "mejorado_por_revisar",
    "cv.updatedAt": FieldValue.serverTimestamp(),
  });

  console.log(
    `\nListo: cv.status → mejorado_por_revisar.\n` +
      `El candidato ahora puede Aprobar o pedir cambios desde /cv en la app.\n` +
      `(Recuerda haberle enviado el PDF mejorado por correo antes de este paso.)`
  );
}

main().catch((e) => {
  console.error("FAILED:", (e as Error).message);
  process.exit(1);
});
