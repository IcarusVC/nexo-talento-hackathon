/**
 * Team-side application workflow tool — run with:
 *   npx tsx scripts/application-set-status.ts <applicationId> <nextStatus>
 *
 * Moves an application through the status graph with the CORRECT wallet side
 * effects (lib/wallet.ts is the single source of truth):
 *   enviada       → settles the hold: balance −1, reserved −1, ledger SETTLE
 *   no_aplicable  → releases the hold: reserved −1, ledger RELEASE (+1 available)
 *   en_entrevista | rechazada | oferta → status only, wallet untouched
 *
 * Never set these by hand in the Firebase console anymore — a raw status edit
 * would leave the user's reserved token stuck forever.
 */
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const TEAM_STATUSES = ["enviada", "no_aplicable", "en_entrevista", "rechazada", "oferta"];

async function main() {
  const [applicationId, nextStatus] = process.argv.slice(2);
  if (!applicationId || !TEAM_STATUSES.includes(nextStatus)) {
    console.error(
      `Uso: npx tsx scripts/application-set-status.ts <applicationId> <${TEAM_STATUSES.join("|")}>`
    );
    process.exit(1);
  }

  const { getAdminDb } = await import("../src/lib/firebase-admin");
  const { transitionApplication, WalletError } = await import("../src/lib/wallet");
  const { APPLICATION_STATUS_LABELS } = await import("../src/lib/constants");
  type AppStatus = keyof typeof APPLICATION_STATUS_LABELS;
  const db = getAdminDb();

  const appSnap = await db.doc(`applications/${applicationId}`).get();
  if (!appSnap.exists) {
    console.error(`No existe applications/${applicationId}`);
    process.exit(1);
  }
  const app = appSnap.data()!;
  console.log(
    `Postulación: ${app.listingTitle} (${app.company})\n` +
      `Usuario: ${app.userId}\n` +
      `Estado: ${app.status} → ${nextStatus}` +
      (app.tokenReserved === true ? " (con token reservado)" : " (sin token reservado)")
  );

  try {
    await transitionApplication(db, {
      applicationId,
      nextStatus: nextStatus as AppStatus,
    });
  } catch (error) {
    if (error instanceof WalletError) {
      console.error(`Rechazado (${error.code}): transición no permitida desde "${app.status}".`);
      process.exit(1);
    }
    throw error;
  }

  const wallet = (await db.doc(`users/${app.userId}`).get()).data()?.wallet;
  console.log(
    `\nListo: ${APPLICATION_STATUS_LABELS[nextStatus as AppStatus]}.\n` +
      `Wallet del usuario ahora: balance=${wallet?.balance}, reserved=${wallet?.reserved}`
  );
}

main().catch((e) => {
  console.error("FAILED:", (e as Error).message);
  process.exit(1);
});
