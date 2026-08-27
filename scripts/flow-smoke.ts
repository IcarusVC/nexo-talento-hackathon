/**
 * Flow credentials smoke test — run with: npx tsx scripts/flow-smoke.ts
 *
 * Creates a REAL (but never-paid) payment order and reads its status back,
 * against both Flow environments, to verify the configured credentials and
 * discover which base URL they belong to. No money moves: the order is left
 * pending and expires on Flow's side. Never prints the keys themselves.
 */
import { config } from "dotenv";
import { signParams } from "../src/lib/flow";
import { TOKEN_PACK } from "../src/lib/constants";

config({ path: ".env.local" });

const API_KEY = process.env.FLOW_API_KEY ?? "";
const SECRET_KEY = process.env.FLOW_SECRET_KEY ?? "";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
// Payer email attached to the never-paid smoke order (any inbox you control).
const SMOKE_EMAIL = process.env.OWNER_CV_INBOX ?? "smoke-test@example.com";

const BASES = ["https://www.flow.cl/api", "https://sandbox.flow.cl/api"] as const;

async function tryBase(base: string) {
  const params: Record<string, string> = {
    apiKey: API_KEY,
    commerceOrder: `smoke-${Date.now()}`,
    subject: `TurboTrabajo smoke test (${TOKEN_PACK.tokens} tokens)`,
    currency: "CLP",
    amount: String(TOKEN_PACK.priceClp),
    email: SMOKE_EMAIL,
    urlConfirmation: `${APP_URL}/api/flow/webhook`,
    urlReturn: `${APP_URL}/tokens`,
  };
  params.s = signParams(params, SECRET_KEY);

  const createRes = await fetch(`${base}/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });

  const createText = await createRes.text();
  if (!createRes.ok) {
    console.log(`[${base}] payment/create -> HTTP ${createRes.status}: ${createText.slice(0, 200)}`);
    return false;
  }

  const order = JSON.parse(createText) as { url: string; token: string; flowOrder: number };
  console.log(`[${base}] payment/create OK -> flowOrder=${order.flowOrder}, payUrl=${order.url}?token=${order.token.slice(0, 8)}…`);

  const statusParams: Record<string, string> = { apiKey: API_KEY, token: order.token };
  statusParams.s = signParams(statusParams, SECRET_KEY);
  const statusRes = await fetch(
    `${base}/payment/getStatus?${new URLSearchParams(statusParams)}`
  );
  const statusText = await statusRes.text();
  if (!statusRes.ok) {
    console.log(`[${base}] payment/getStatus -> HTTP ${statusRes.status}: ${statusText.slice(0, 200)}`);
    return false;
  }

  const status = JSON.parse(statusText) as { status: number; amount: string | number; commerceOrder: string };
  console.log(
    `[${base}] getStatus OK -> status=${status.status} (1=pending esperado), amount=${status.amount}, commerceOrder=${status.commerceOrder}`
  );
  // The webhook's amount guard compares against a number — surface the actual
  // JSON types Flow returns so a string amount can't silently break crediting.
  console.log(
    `[${base}] JSON field types -> ` +
      JSON.stringify(
        Object.fromEntries(Object.entries(status).map(([k, v]) => [k, typeof v]))
      )
  );
  return status.status === 1;
}

async function main() {
  if (!API_KEY || !SECRET_KEY) {
    console.error("FLOW_API_KEY / FLOW_SECRET_KEY not set in .env.local");
    process.exit(1);
  }
  for (const base of BASES) {
    try {
      const ok = await tryBase(base);
      if (ok) {
        console.log(`\nRESULT: credentials are valid for ${base}`);
        return;
      }
    } catch (error) {
      console.log(`[${base}] error: ${(error as Error).message}`);
    }
  }
  console.log("\nRESULT: credentials were not accepted by either environment");
  process.exit(1);
}

main();
