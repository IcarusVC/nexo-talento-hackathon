import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeFirestore } from "@/test/fake-firestore";

vi.mock("@/lib/firebase-token", () => ({
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDb: vi.fn(),
}));

import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { getAdminDb } from "@/lib/firebase-admin";
import { POST } from "./route";

const UID = "uid123abc";
const APP_ID = `${UID}_L1`;

function withdrawRequest(body: unknown, withAuth = true) {
  return new NextRequest("http://localhost/api/applications/withdraw", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(withAuth ? { authorization: "Bearer good" } : {}),
    },
    body: JSON.stringify(body),
  });
}

let db: FakeFirestore;

beforeEach(() => {
  db = new FakeFirestore();
  db.docs.set(`users/${UID}`, {
    wallet: { balance: 5, reserved: 1 },
    cv: { status: "aprobado", version: 2 },
  });
  db.docs.set(`applications/${APP_ID}`, {
    userId: UID,
    listingId: "L1",
    status: "pendiente",
    statusHistory: [{ status: "pendiente", at: { fake: true } }],
    tokenReserved: true,
  });
  vi.mocked(getAdminDb).mockReturnValue(db as never);
  vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: UID } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/applications/withdraw", () => {
  it("requires a bearer token", async () => {
    const res = await POST(withdrawRequest({ applicationId: APP_ID }, false));
    expect(res.status).toBe(401);
  });

  it("requires an applicationId", async () => {
    const res = await POST(withdrawRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects an applicationId with path separators as 400, not a 500", async () => {
    const res = await POST(withdrawRequest({ applicationId: "a/b" }));
    expect(res.status).toBe(400);
  });

  it("withdraws own pending application and releases the token", async () => {
    const res = await POST(withdrawRequest({ applicationId: APP_ID }));
    expect(res.status).toBe(200);
    expect(db.docs.get(`applications/${APP_ID}`)).toMatchObject({
      status: "retirada",
      tokenReserved: false,
    });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
  });

  it("maps forbidden (someone else's application) to 403", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: "intruder" } as never);
    const res = await POST(withdrawRequest({ applicationId: APP_ID }));
    expect(res.status).toBe(403);
    expect(db.docs.get(`applications/${APP_ID}`)?.status).toBe("pendiente");
  });

  it("maps invalid_transition (already sent) to 409", async () => {
    db.docs.set(`applications/${APP_ID}`, {
      userId: UID,
      listingId: "L1",
      status: "enviada",
      statusHistory: [],
      tokenReserved: false,
    });
    const res = await POST(withdrawRequest({ applicationId: APP_ID }));
    expect(res.status).toBe(409);
  });

  it("maps application_not_found to 404", async () => {
    const res = await POST(withdrawRequest({ applicationId: "ghost" }));
    expect(res.status).toBe(404);
  });
});
