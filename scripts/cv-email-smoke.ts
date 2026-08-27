/**
 * CV email smoke test — run with: npx tsx scripts/cv-email-smoke.ts
 *
 * Sends the exact "Nuevo CV" email the intake route produces, with a tiny
 * valid PDF attached. With GMAIL_USER + GMAIL_APP_PASSWORD in .env.local it
 * sends a REAL email to OWNER_CV_INBOX (use this to verify the App Password);
 * without them it uses an Ethereal test inbox and prints a preview URL.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

// A minimal but structurally valid single-page PDF, so mail clients render it.
const TINY_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
xref
0 4
0000000000 65535 f
trailer<</Size 4/Root 1 0 R>>
%%EOF`,
  "latin1"
);

async function main() {
  const { sendCvEmail } = await import("../src/lib/email");
  const to = process.env.OWNER_CV_INBOX;
  if (!to) {
    console.error("OWNER_CV_INBOX not set in .env.local — nowhere to send the smoke test.");
    process.exit(1);
    return;
  }

  const result = await sendCvEmail({
    to,
    subject: "Nuevo CV — smoke test (uid smoke-test)",
    text: `Nuevo CV recibido en TurboTrabajo.

Correo: smoke-test@turbotrabajo.local
Nombre: Smoke Test
UID: smoke-test
Versión: 1

Este es un correo de prueba del flujo de intake de CV (scripts/cv-email-smoke.ts).`,
    attachment: { filename: "cv-smoke-test-v1.pdf", content: TINY_PDF },
  });

  console.log(`provider: ${result.provider}`);
  console.log(`to:       ${to}`);
  if (result.previewUrl) {
    console.log(`preview:  ${result.previewUrl}`);
    console.log("\n(Ethereal: correo de prueba — nada llegó a un buzón real.)");
  } else {
    console.log("\nCorreo REAL enviado vía Gmail — revisa la bandeja de entrada.");
  }
}

main().catch((e) => {
  console.error("FAILED:", (e as Error).message);
  process.exit(1);
});
