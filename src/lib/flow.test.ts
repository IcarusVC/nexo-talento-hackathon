import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Flow.cl client unit tests. `signParams` is the pure HMAC signer every Flow
 * call depends on — golden values were computed independently with node:crypto
 * so a refactor that changes concatenation/sorting breaks loudly.
 */

async function importFlow() {
  vi.resetModules();
  return import("@/lib/flow");
}

beforeEach(() => {
  vi.stubEnv("FLOW_API_KEY", "AK-1");
  vi.stubEnv("FLOW_SECRET_KEY", "test-secret");
  vi.stubEnv("FLOW_API_BASE_URL", "https://flow.test/api");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("signParams", () => {
  it("signs sorted key+value concatenation with HMAC-SHA256 hex", async () => {
    const { signParams } = await importFlow();
    // keys deliberately out of order: must sign "a1b2", not "b2a1"
    expect(signParams({ b: "2", a: "1" }, "test-secret")).toBe(
      "f44e783ccbf7c8b9f1d0e98da75e41e42a515cffdc1b8fd4e8f976efe0330a02"
    );
  });

  it("never includes the signature param itself", async () => {
    const { signParams } = await importFlow();
    expect(signParams({ a: "1", b: "2" }, "test-secret")).toBe(
      signParams({ b: "2", a: "1" }, "test-secret")
    );
  });
});

describe("createPaymentOrder", () => {
  it("POSTs a correctly signed form to payment/create", async () => {
    const { createPaymentOrder } = await importFlow();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ url: "https://flow.test/pay", token: "tok1", flowOrder: 99 }),
        { status: 200 }
      )
    );

    const result = await createPaymentOrder({
      commerceOrder: "uid123-111",
      subject: "Pack",
      amount: 10000,
      email: "qa@tt.cl",
      urlConfirmation: "https://x/api/flow/webhook",
      urlReturn: "https://x/tokens",
    });

    expect(result).toEqual({ url: "https://flow.test/pay", token: "tok1", flowOrder: 99 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://flow.test/api/payment/create");
    const body = init?.body as URLSearchParams;
    expect(body.get("apiKey")).toBe("AK-1");
    expect(body.get("currency")).toBe("CLP");
    expect(body.get("amount")).toBe("10000");
    // golden signature over the exact sorted param concatenation
    // ("amount10000apiKeyAK-1…urlReturnhttps://x/tokens"), HMAC-SHA256
    // recomputed independently with node:crypto
    expect(body.get("s")).toBe(
      "8b90ff1081df660d591ec6a4f342078d9db7000ce502c74e375daf2be0ebb879"
    );
  });

  it("throws on a non-2xx Flow response", async () => {
    const { createPaymentOrder } = await importFlow();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Invalid apiKey", { status: 401 })
    );

    await expect(
      createPaymentOrder({
        commerceOrder: "u-1",
        subject: "Pack",
        amount: 10000,
        email: "qa@tt.cl",
        urlConfirmation: "https://x/w",
        urlReturn: "https://x/r",
      })
    ).rejects.toThrow(/401/);
  });
});

describe("getPaymentStatus", () => {
  it("signs the query string and normalizes the payment", async () => {
    const { getPaymentStatus, signParams } = await importFlow();
    // Real production shape (verified 2026-07-17 via scripts/flow-smoke.ts):
    // Flow returns `amount` as a STRING. getPaymentStatus must normalize it,
    // or the webhook's numeric amount guard rejects every legitimate payment.
    const wirePayment = {
      flowOrder: 99,
      commerceOrder: "uid123-111",
      status: 1,
      amount: "10000",
      payer: "qa@tt.cl",
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(wirePayment), { status: 200 }));

    const result = await getPaymentStatus("tok1");
    expect(result).toEqual({ ...wirePayment, amount: 10000 });

    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/api/payment/getStatus");
    expect(url.searchParams.get("apiKey")).toBe("AK-1");
    expect(url.searchParams.get("token")).toBe("tok1");
    expect(url.searchParams.get("s")).toBe(
      signParams({ apiKey: "AK-1", token: "tok1" }, "test-secret")
    );
  });
});
