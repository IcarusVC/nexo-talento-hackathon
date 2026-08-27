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

function applyRequest(body: unknown, withAuth = true) {
  return new NextRequest("http://localhost/api/applications", {
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
    wallet: { balance: 5, reserved: 0 },
    cv: { status: "aprobado", version: 2 },
  });
  db.docs.set("listings/L1", { title: "Analista", company: "Acme", active: true });
  vi.mocked(getAdminDb).mockReturnValue(db as never);
  vi.mocked(verifyFirebaseIdToken).mockResolvedValue({ uid: UID } as never);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/applications", () => {
  it("requires a bearer token", async () => {
    const res = await POST(applyRequest({ listingId: "L1" }, false));
    expect(res.status).toBe(401);
  });

  it("requires a listingId", async () => {
    const res = await POST(applyRequest({}));
    expect(res.status).toBe(400);
  });

  it("rejects a listingId with path separators as 400, not a 500", async () => {
    // A "/" would turn listings/{id} into an invalid odd-segment doc path and
    // make firebase-admin throw — malformed input must fail as a client error.
    const res = await POST(applyRequest({ listingId: "a/b" }));
    expect(res.status).toBe(400);
  });

  it("applies: creates the application and reserves a token", async () => {
    const res = await POST(applyRequest({ listingId: "L1" }));
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ applicationId: `${UID}_L1` });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 1 });
  });

  it("maps cv_not_approved to 403", async () => {
    db.docs.set(`users/${UID}`, {
      wallet: { balance: 5, reserved: 0 },
      cv: { status: "pendiente_mejora", version: 1 },
    });
    const res = await POST(applyRequest({ listingId: "L1" }));
    expect(res.status).toBe(403);
  });

  it("maps no_tokens to 402", async () => {
    db.docs.set(`users/${UID}`, {
      wallet: { balance: 0, reserved: 0 },
      cv: { status: "aprobado", version: 2 },
    });
    const res = await POST(applyRequest({ listingId: "L1" }));
    expect(res.status).toBe(402);
  });

  it("maps listing_not_found to 404", async () => {
    const res = await POST(applyRequest({ listingId: "ghost" }));
    expect(res.status).toBe(404);
  });

  it("maps duplicate to 409", async () => {
    const first = await POST(applyRequest({ listingId: "L1" }));
    expect(first.status).toBe(201);
    const second = await POST(applyRequest({ listingId: "L1" }));
    expect(second.status).toBe(409);
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 1 });
  });
});
