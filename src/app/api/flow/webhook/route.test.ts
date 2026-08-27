import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "@/test/fake-firestore";
import { TOKEN_PACK } from "@/lib/constants";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: vi.fn(),
}));

vi.mock("@/lib/flow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/flow")>();
  return { ...actual, getPaymentStatus: vi.fn() };
});

import { getAdminDb } from "@/lib/firebase-admin";
import { getPaymentStatus, type FlowPaymentStatus } from "@/lib/flow";
import { POST } from "./route";

const UID = "uid123abc";

function webhookRequest(token?: string) {
  const form = new FormData();
  if (token !== undefined) form.set("token", token);
  return new NextRequest("http://localhost/api/flow/webhook", {
    method: "POST",
    body: form,
  });
}

function payment(overrides: Partial<FlowPaymentStatus> = {}): FlowPaymentStatus {
  return {
    flowOrder: 555,
    commerceOrder: `${UID}-1721200000000`,
    status: 2, // PAID
    amount: TOKEN_PACK.priceClp,
    payer: "qa@tt.cl",
    ...overrides,
  };
}

let db: FakeFirestore;

beforeEach(() => {
  db = new FakeFirestore();
  db.docs.set(`users/${UID}`, { wallet: { balance: 5, reserved: 0 } });
  vi.mocked(getAdminDb).mockReturnValue(db as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/flow/webhook", () => {
  it("rejects a confirmation without token", async () => {
    const res = await POST(webhookRequest());
    expect(res.status).toBe(400);
    expect(vi.mocked(getPaymentStatus)).not.toHaveBeenCalled();
  });

  it("rejects an unparseable commerceOrder", async () => {
    vi.mocked(getPaymentStatus).mockResolvedValue(payment({ commerceOrder: "nodash" }));
    const res = await POST(webhookRequest("tok"));
    expect(res.status).toBe(400);
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
  });

  it("records a pending payment without crediting", async () => {
    vi.mocked(getPaymentStatus).mockResolvedValue(payment({ status: 1 }));
    const res = await POST(webhookRequest("tok"));

    expect(res.status).toBe(200);
    expect(db.docs.get("payments/555")).toMatchObject({
      userId: UID,
      credited: false,
      status: "1",
    });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)).toHaveLength(0);
  });

  it("credits the pack to the wallet exactly once on a paid order", async () => {
    vi.mocked(getPaymentStatus).mockResolvedValue(payment());
    const res = await POST(webhookRequest("tok"));

    expect(res.status).toBe(200);
    // balance 5 + 100-token pack
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({
      balance: 5 + TOKEN_PACK.tokens,
      reserved: 0,
    });
    expect(db.docs.get("payments/555")).toMatchObject({
      credited: true,
      tokensCredited: TOKEN_PACK.tokens,
    });
    const ledger = db.docsUnder(`users/${UID}/tokenLedger`);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: "purchase",
      amount: TOKEN_PACK.tokens,
      balanceAfter: 5 + TOKEN_PACK.tokens,
      flowOrder: "555",
    });
  });

  it("is idempotent across Flow webhook retries", async () => {
    vi.mocked(getPaymentStatus).mockResolvedValue(payment());

    const first = await POST(webhookRequest("tok"));
    const second = await POST(webhookRequest("tok"));

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({
      balance: 5 + TOKEN_PACK.tokens,
      reserved: 0,
    });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)).toHaveLength(1);
  });

  it("does NOT credit a paid order whose amount differs from the pack price", async () => {
    vi.mocked(getPaymentStatus).mockResolvedValue(payment({ amount: 999 }));
    const res = await POST(webhookRequest("tok"));

    // 200 so Flow stops retrying — but flagged, never credited.
    expect(res.status).toBe(200);
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)).toHaveLength(0);
    expect(db.docs.get("payments/555")).toMatchObject({
      credited: false,
      amountMismatch: true,
    });
  });

  it("fails loudly (500) when the paid user doc is missing", async () => {
    vi.mocked(getPaymentStatus).mockResolvedValue(
      payment({ commerceOrder: "ghost-1721200000000" })
    );
    const res = await POST(webhookRequest("tok"));
    expect(res.status).toBe(500);
  });
});
