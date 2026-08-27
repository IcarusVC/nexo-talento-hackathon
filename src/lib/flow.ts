import crypto from "crypto";

/**
 * Minimal Flow.cl Payment API client (https://www.flow.cl/docs/api.html).
 *
 * We use Flow's standard one-off Payment API to sell a token pack (TOKEN_PACK).
 * A confirmed payment credits `users/{uid}.wallet.balance` with the pack's tokens
 * via the webhook handler (see api/flow/webhook). One token = one application.
 */

const FLOW_API_KEY = process.env.FLOW_API_KEY ?? "";
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY ?? "";
const FLOW_API_BASE_URL = process.env.FLOW_API_BASE_URL ?? "https://sandbox.flow.cl/api";

/**
 * Flow's request signature: HMAC-SHA256 (hex) over the params concatenated as
 * `key + value`, keys sorted alphabetically. Exported pure so tests can pin
 * golden values against an independent implementation.
 */
export function signParams(params: Record<string, string>, secretKey: string): string {
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map((key) => `${key}${params[key]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

function sign(params: Record<string, string>): string {
  return signParams(params, FLOW_SECRET_KEY);
}

interface CreatePaymentOrderInput {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}

export async function createPaymentOrder(input: CreatePaymentOrderInput) {
  const params: Record<string, string> = {
    apiKey: FLOW_API_KEY,
    commerceOrder: input.commerceOrder,
    subject: input.subject,
    currency: "CLP",
    amount: String(input.amount),
    email: input.email,
    urlConfirmation: input.urlConfirmation,
    urlReturn: input.urlReturn,
  };
  params.s = sign(params);

  const body = new URLSearchParams(params);
  const res = await fetch(`${FLOW_API_BASE_URL}/payment/create`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    throw new Error(`Flow createPaymentOrder failed: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<{ url: string; token: string; flowOrder: number }>;
}

export interface FlowPaymentStatus {
  flowOrder: number;
  commerceOrder: string;
  status: number; // 1 pending, 2 paid, 3 rejected, 4 canceled
  amount: number;
  payer: string;
}

export async function getPaymentStatus(token: string): Promise<FlowPaymentStatus> {
  const params: Record<string, string> = { apiKey: FLOW_API_KEY, token };
  params.s = sign(params);

  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${FLOW_API_BASE_URL}/payment/getStatus?${query}`);

  if (!res.ok) {
    throw new Error(`Flow getPaymentStatus failed: ${res.status} ${await res.text()}`);
  }

  // Production Flow serializes `amount` as a JSON string ("10000") even though
  // its docs type it as number — normalize at the boundary so callers (e.g. the
  // webhook's amount guard) can compare numerically.
  const raw = (await res.json()) as Omit<FlowPaymentStatus, "amount"> & {
    amount: number | string;
  };
  return { ...raw, amount: Number(raw.amount) };
}

export const FLOW_PAYMENT_STATUS = {
  PENDING: 1,
  PAID: 2,
  REJECTED: 3,
  CANCELED: 4,
} as const;
