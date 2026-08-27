import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TOKEN_PACK } from "@/lib/constants";

vi.mock("@/lib/firebase-token", () => ({
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/lib/flow", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/flow")>();
  return { ...actual, createPaymentOrder: vi.fn() };
});

import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { createPaymentOrder } from "@/lib/flow";
import { POST } from "./route";

function orderRequest(authorization?: string) {
  return new NextRequest("http://localhost/api/flow/create-order", {
    method: "POST",
    headers: authorization ? { authorization } : {},
  });
}

beforeEach(() => {
  vi.stubEnv("FLOW_API_KEY", "AK-1");
  vi.stubEnv("FLOW_SECRET_KEY", "sec");
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("POST /api/flow/create-order", () => {
  it("returns an honest 503 while Flow credentials are missing", async () => {
    vi.stubEnv("FLOW_API_KEY", "");
    vi.stubEnv("FLOW_SECRET_KEY", "");
    const res = await POST(orderRequest("Bearer x"));
    expect(res.status).toBe(503);
  });

  it("requires a bearer token", async () => {
    const res = await POST(orderRequest());
    expect(res.status).toBe(401);
  });

  it("rejects an invalid Firebase ID token", async () => {
    vi.mocked(verifyFirebaseIdToken).mockRejectedValue(new Error("bad token"));
    const res = await POST(orderRequest("Bearer bad"));
    expect(res.status).toBe(401);
  });

  it("creates a pack order for the authenticated user and returns the redirect", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "uid123abc",
      email: "qa@tt.cl",
    } as never);
    vi.mocked(createPaymentOrder).mockResolvedValue({
      url: "https://flow.test/pay",
      token: "tok9",
      flowOrder: 42,
    });

    const res = await POST(orderRequest("Bearer good"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      redirectUrl: "https://flow.test/pay?token=tok9",
    });

    const input = vi.mocked(createPaymentOrder).mock.calls[0][0];
    expect(input.amount).toBe(TOKEN_PACK.priceClp);
    expect(input.email).toBe("qa@tt.cl");
    expect(input.commerceOrder.startsWith("uid123abc-")).toBe(true);
    expect(input.urlConfirmation.endsWith("/api/flow/webhook")).toBe(true);
    expect(input.urlReturn.endsWith("/tokens")).toBe(true);
  });

  it("maps Flow API failures to a 502", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "uid123abc",
      email: "qa@tt.cl",
    } as never);
    vi.mocked(createPaymentOrder).mockRejectedValue(new Error("Flow down"));

    const res = await POST(orderRequest("Bearer good"));
    expect(res.status).toBe(502);
  });
});
