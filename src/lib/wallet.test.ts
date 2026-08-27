import { beforeEach, describe, expect, it } from "vitest";
import { FakeFirestore } from "@/test/fake-firestore";
import { applyToListing, transitionApplication, WalletError } from "@/lib/wallet";

/**
 * Workstream C — server-authoritative token spend.
 * Semantics pinned here (mirrors the TokenLedgerEntry.amount doc comment:
 * "+100 purchase, +5 trial, -1 reserve, +1 release"):
 *  - apply    → application `pendiente` + wallet.reserved+1 + ledger RESERVE −1
 *  - enviada  → settle: balance−1, reserved−1, ledger SETTLE 0
 *  - no_aplicable / retirada (from pendiente) → release: reserved−1, ledger RELEASE +1
 *  - post-send states (en_entrevista/rechazada/oferta) → status only, no wallet
 *  - legacy applications without tokenReserved → status only, never touch wallet
 */

const UID = "uid123abc";
const LISTING = "L1";
const APP_ID = `${UID}_${LISTING}`;

let db: FakeFirestore;

function seedUser(overrides: Record<string, unknown> = {}) {
  db.docs.set(`users/${UID}`, {
    displayName: "QA",
    wallet: { balance: 5, reserved: 0 },
    cv: { status: "aprobado", version: 2 },
    ...overrides,
  });
}

function seedListing(overrides: Record<string, unknown> = {}) {
  db.docs.set(`listings/${LISTING}`, {
    title: "Analista de Datos",
    company: "Acme",
    active: true,
    ...overrides,
  });
}

function seedApplication(overrides: Record<string, unknown> = {}) {
  db.docs.set(`applications/${APP_ID}`, {
    userId: UID,
    listingId: LISTING,
    listingTitle: "Analista de Datos",
    company: "Acme",
    status: "pendiente",
    statusHistory: [{ status: "pendiente", at: { fake: true } }],
    cvVersionUsed: 2,
    tokenReserved: true,
    ...overrides,
  });
}

async function expectWalletError(promise: Promise<unknown>, code: string) {
  const error = await promise.then(
    () => null,
    (e) => e
  );
  expect(error).toBeInstanceOf(WalletError);
  expect((error as WalletError).code).toBe(code);
}

beforeEach(() => {
  db = new FakeFirestore();
});

describe("applyToListing", () => {
  it("creates a pending application under a deterministic id and reserves one token", async () => {
    seedUser();
    seedListing();

    const result = await applyToListing(db as never, { uid: UID, listingId: LISTING });

    expect(result.applicationId).toBe(APP_ID);
    expect(db.docs.get(`applications/${APP_ID}`)).toMatchObject({
      userId: UID,
      listingId: LISTING,
      listingTitle: "Analista de Datos",
      company: "Acme",
      status: "pendiente",
      cvVersionUsed: 2,
      tokenReserved: true,
    });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 1 });

    const ledger = db.docsUnder(`users/${UID}/tokenLedger`);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: "reserve",
      amount: -1,
      balanceAfter: 5,
      flowOrder: null,
      applicationId: APP_ID,
    });
  });

  it("rejects when the CV is not approved", async () => {
    seedUser({ cv: { status: "mejorado_por_revisar", version: 2 } });
    seedListing();
    await expectWalletError(
      applyToListing(db as never, { uid: UID, listingId: LISTING }),
      "cv_not_approved"
    );
    expect(db.docs.get(`applications/${APP_ID}`)).toBeUndefined();
  });

  it("rejects when every token is already reserved", async () => {
    seedUser({ wallet: { balance: 5, reserved: 5 } });
    seedListing();
    await expectWalletError(
      applyToListing(db as never, { uid: UID, listingId: LISTING }),
      "no_tokens"
    );
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 5 });
  });

  it("rejects when the balance is zero", async () => {
    seedUser({ wallet: { balance: 0, reserved: 0 } });
    seedListing();
    await expectWalletError(
      applyToListing(db as never, { uid: UID, listingId: LISTING }),
      "no_tokens"
    );
  });

  it("rejects a listing that does not exist", async () => {
    seedUser();
    await expectWalletError(
      applyToListing(db as never, { uid: UID, listingId: "ghost" }),
      "listing_not_found"
    );
  });

  it("rejects a deactivated listing", async () => {
    seedUser();
    seedListing({ active: false });
    await expectWalletError(
      applyToListing(db as never, { uid: UID, listingId: LISTING }),
      "listing_not_found"
    );
  });

  it("rejects a duplicate application without touching the wallet", async () => {
    seedUser();
    seedListing();
    seedApplication();
    await expectWalletError(
      applyToListing(db as never, { uid: UID, listingId: LISTING }),
      "duplicate"
    );
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)).toHaveLength(0);
  });

  it("rejects an unknown user", async () => {
    seedListing();
    await expectWalletError(
      applyToListing(db as never, { uid: "ghost", listingId: LISTING }),
      "user_not_found"
    );
  });
});

describe("transitionApplication — settle on enviada", () => {
  it("charges the reserved token exactly once", async () => {
    seedUser({ wallet: { balance: 5, reserved: 1 } });
    seedApplication();

    await transitionApplication(db as never, {
      applicationId: APP_ID,
      nextStatus: "enviada",
    });

    const app = db.docs.get(`applications/${APP_ID}`);
    expect(app).toMatchObject({ status: "enviada", tokenReserved: false });
    expect((app?.statusHistory as unknown[]).length).toBe(2);
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 4, reserved: 0 });

    const ledger = db.docsUnder(`users/${UID}/tokenLedger`);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({
      type: "settle",
      amount: 0,
      balanceAfter: 4,
      applicationId: APP_ID,
    });
  });

  it("does not touch the wallet for legacy applications that never reserved", async () => {
    seedUser({ wallet: { balance: 5, reserved: 0 } });
    seedApplication({ tokenReserved: undefined });
    delete (db.docs.get(`applications/${APP_ID}`) as Record<string, unknown>).tokenReserved;

    await transitionApplication(db as never, {
      applicationId: APP_ID,
      nextStatus: "enviada",
    });

    expect(db.docs.get(`applications/${APP_ID}`)).toMatchObject({ status: "enviada" });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)).toHaveLength(0);
  });
});

describe("transitionApplication — release paths", () => {
  it("releases the token on no_aplicable", async () => {
    seedUser({ wallet: { balance: 5, reserved: 1 } });
    seedApplication();

    await transitionApplication(db as never, {
      applicationId: APP_ID,
      nextStatus: "no_aplicable",
    });

    expect(db.docs.get(`applications/${APP_ID}`)).toMatchObject({
      status: "no_aplicable",
      tokenReserved: false,
    });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });

    const ledger = db.docsUnder(`users/${UID}/tokenLedger`);
    expect(ledger).toHaveLength(1);
    expect(ledger[0]).toMatchObject({ type: "release", amount: 1, balanceAfter: 5 });
  });

  it("releases the token when the owner withdraws a pending application", async () => {
    seedUser({ wallet: { balance: 5, reserved: 1 } });
    seedApplication();

    await transitionApplication(db as never, {
      applicationId: APP_ID,
      nextStatus: "retirada",
      requesterUid: UID,
    });

    expect(db.docs.get(`applications/${APP_ID}`)).toMatchObject({ status: "retirada" });
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 5, reserved: 0 });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)[0]).toMatchObject({ type: "release" });
  });

  it("forbids withdrawing someone else's application", async () => {
    seedUser({ wallet: { balance: 5, reserved: 1 } });
    seedApplication();
    await expectWalletError(
      transitionApplication(db as never, {
        applicationId: APP_ID,
        nextStatus: "retirada",
        requesterUid: "intruder",
      }),
      "forbidden"
    );
    expect(db.docs.get(`applications/${APP_ID}`)?.status).toBe("pendiente");
  });

  it("forbids a requester from setting any status other than retirada", async () => {
    seedUser({ wallet: { balance: 5, reserved: 1 } });
    seedApplication();
    await expectWalletError(
      transitionApplication(db as never, {
        applicationId: APP_ID,
        nextStatus: "enviada",
        requesterUid: UID,
      }),
      "forbidden"
    );
  });
});

describe("transitionApplication — status graph", () => {
  it("allows post-send updates without wallet movement", async () => {
    seedUser({ wallet: { balance: 4, reserved: 0 } });
    seedApplication({ status: "enviada", tokenReserved: false });

    await transitionApplication(db as never, {
      applicationId: APP_ID,
      nextStatus: "en_entrevista",
    });

    expect(db.docs.get(`applications/${APP_ID}`)?.status).toBe("en_entrevista");
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 4, reserved: 0 });
    expect(db.docsUnder(`users/${UID}/tokenLedger`)).toHaveLength(0);
  });

  it("rejects re-settling an already sent application", async () => {
    seedUser({ wallet: { balance: 4, reserved: 0 } });
    seedApplication({ status: "enviada", tokenReserved: false });
    await expectWalletError(
      transitionApplication(db as never, { applicationId: APP_ID, nextStatus: "enviada" }),
      "invalid_transition"
    );
    expect(db.docs.get(`users/${UID}`)?.wallet).toEqual({ balance: 4, reserved: 0 });
  });

  it("rejects withdrawing an application that was already sent", async () => {
    seedUser({ wallet: { balance: 4, reserved: 0 } });
    seedApplication({ status: "enviada", tokenReserved: false });
    await expectWalletError(
      transitionApplication(db as never, {
        applicationId: APP_ID,
        nextStatus: "retirada",
        requesterUid: UID,
      }),
      "invalid_transition"
    );
  });

  it("rejects transitions out of a terminal state", async () => {
    seedUser();
    seedApplication({ status: "retirada", tokenReserved: false });
    await expectWalletError(
      transitionApplication(db as never, { applicationId: APP_ID, nextStatus: "enviada" }),
      "invalid_transition"
    );
  });

  it("rejects an unknown application", async () => {
    seedUser();
    await expectWalletError(
      transitionApplication(db as never, { applicationId: "ghost", nextStatus: "enviada" }),
      "application_not_found"
    );
  });
});
