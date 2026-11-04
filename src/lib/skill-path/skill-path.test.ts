import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { loadDataset, parseCsv, type Dataset } from "./data";
import { analyzeApplication, buildWorkspace, daysSince, validDate } from "./engine";
import { readActionBody } from "./http";
import { SkillPathStore, type LedgerEntry } from "./store";
import type { ActionInput } from "./types";

const TODAY = "2026-11-04";
const NOW = new Date("2026-11-04T15:00:00Z");
let data: Dataset;
const temporary: string[] = [];
beforeAll(async () => { data = await loadDataset(); });
afterEach(async () => {
  for (const folder of temporary.splice(0)) {
    const resolved = path.resolve(folder);
    if (path.dirname(resolved) !== path.resolve(tmpdir()) || !path.basename(resolved).startsWith("skillpath-test-")) throw new Error("Unexpected test directory");
    await rm(resolved, { recursive: true, force: true });
  }
});
async function testStore() { const folder = await mkdtemp(path.join(tmpdir(), "skillpath-test-")); temporary.push(folder); return { folder, store: new SkillPathStore({ ledgerRoot: folder, now: () => NOW }) }; }
function command(values: Partial<ActionInput> = {}): ActionInput { return { accountId: "USR-025", action: "change_state", applicationId: "POS-0242", expectedVersion: 0, idempotencyKey: "test-action-key-00001", note: "Revisión humana de requisitos publicados.", humanConfirmed: true, newState: "Entrevista", ...values }; }
function simple(action: ActionInput["action"], values: Partial<ActionInput> = {}): ActionInput { return { accountId: "USR-025", action, applicationId: "POS-0242", expectedVersion: 0, idempotencyKey: `test-${action}-000001`, note: "Antecedentes revisados por una persona autorizada.", ...values }; }

describe("CSV and evidence interpretation", () => {
  it("loads all four original files without joining by names", () => {
    expect([data.accounts.length, data.vacancies.length, data.applications.length, data.events.length]).toEqual([60, 60, 500, 1500]);
    expect(new Set(data.accounts.map((a) => a.name)).size).toBeLessThan(data.accounts.length);
    expect(data.applications.every((a) => data.vacancies.some((v) => v.id === a.vacancyId))).toBe(true);
  });
  it("reads quoted fields and preserves blank values", () => {
    expect(parseCsv('\uFEFFid,note,missing\r\nA,"one, two ""three""",\r\n')).toEqual([{ id: "A", note: 'one, two "three"', missing: "" }]);
    expect(() => parseCsv('a,b\n"unclosed,value')).toThrow();
  });
  it("keeps a missing communication date distinct from no contact", () => {
    const view = buildWorkspace(data, "USR-004", 0, [], TODAY);
    const application = view.applications.find((a) => a.id === "POS-0004")!;
    expect(application.communication.confirmed).toBe(false);
    expect(application.communication.at).toBeNull();
    expect(application.communication.explanation).toContain("no permite afirmar");
  });
  it("retains the original state when stale and uses strictly more than 30 days", () => {
    const application = data.applications.find((a) => a.id === "POS-0007")!;
    const analysis = analyzeApplication(application, data, TODAY);
    expect(analysis.stale).toBe(true);
    expect(analysis.signals.find((s) => s.code === "stale")?.kind).toBe("stale");
    const sample = structuredClone(data); sample.events = []; sample.applications[0].updatedAt = "2026-10-05";
    expect(analyzeApplication(sample.applications[0], sample, TODAY).stale).toBe(false);
    sample.applications[0].updatedAt = "2026-10-04";
    expect(analyzeApplication(sample.applications[0], sample, TODAY).stale).toBe(true);
    expect(application.state).toBe("Recibida");
  });
  it("marks an expired active vacancy without closing it", () => {
    const view = buildWorkspace(data, "USR-047", 0, [], TODAY);
    const vacancy = view.vacancies.find((v) => v.id === "VAC-004")!;
    expect(vacancy.expired).toBe(true); expect(vacancy.state).toBe("Activa");
    expect(view.metrics.find((m) => m.id === "expired_vacancies")?.value).toBe(6);
    expect(view.metrics.find((m) => m.id === "stale_applications")?.value).toBe(130);
    expect(view.metrics.find((m) => m.id === "missing_communication")?.value).toBe(125);
  });
  it("detects discrepant last event using a derived in-memory fixture, preserving source state", () => {
    const sample = structuredClone(data); const application = sample.applications[0];
    sample.events.push({ ...sample.events[0], id: "EVT-99999", at: "2026-11-03", previousState: application.state, newState: "Entrevista", actorId: "REC-001" });
    const analysis = analyzeApplication(application, sample, TODAY);
    expect(analysis.discrepancy).toBe(true); expect(analysis.requiresReview).toBe(true); expect(application.state).toBe("Recibida");
  });
  it("preserves a missing source while a verified matching event can support state", () => {
    const application = data.applications.find((a) => a.id === "POS-0044")!;
    const analysis = analyzeApplication(application, data, TODAY);
    expect(application.source).toBeNull(); expect(analysis.signals.some((s) => s.code === "missing_source")).toBe(true);
    expect(analysis.stateKind).toBe("confirmed");
  });
  it("detects broken chains and does not resolve same-day order by pretending IDs are timestamps", () => {
    expect(analyzeApplication(data.applications.find((a) => a.id === "POS-0212")!, data, TODAY).signals.some((s) => s.code === "broken_chain")).toBe(true);
    const sample = structuredClone(data); const application = sample.applications[0];
    sample.events = [{ ...sample.events[0], at: "2026-11-03", newState: "Recibida" }, { ...sample.events[1], at: "2026-11-03", newState: "Entrevista" }];
    expect(analyzeApplication(application, sample, TODAY).signals.some((s) => s.code === "ambiguous_order")).toBe(true);
  });
  it("rejects invalid/future dates for numeric elapsed time", () => {
    expect(validDate("2026-02-30")).toBe(false); expect(daysSince("2026-11-05", TODAY)).toBeNull(); expect(daysSince(null, TODAY)).toBeNull();
  });
});

describe("role and row-level access", () => {
  it("each candidate sees only own applications, no metrics or internal actors", () => {
    for (const account of data.accounts.filter((a) => a.role === "Candidato")) {
      const view = buildWorkspace(data, account.id, 0, [], TODAY);
      expect(view.applications.length).toBeGreaterThan(0);
      expect(view.applications.every((a) => a.candidateId === account.actorId && !a.events.length)).toBe(true);
      expect(view.metrics).toEqual([]); expect(view.source.counts).toBeNull();
      expect(view.vacancies.every((v) => v.state === "Activa" && v.recruiterId === null && v.updatedAt === null)).toBe(true);
    }
    expect(buildWorkspace(data, "USR-001", 0, [], TODAY).applications.map((a) => a.id)).toEqual(["POS-0001", "POS-0221", "POS-0441"]);
  });
  it("recruiter requires both assigned actor and company portfolio", () => {
    const view = buildWorkspace(data, "USR-025", 0, [], TODAY);
    expect(view.vacancies.map((v) => v.id)).toEqual(["VAC-001"]); expect(view.applications).toHaveLength(5);
    expect(buildWorkspace(data, "USR-030", 0, [], TODAY).vacancies).toEqual([]);
    expect(buildWorkspace(data, "USR-030", 0, [], TODAY).applications).toEqual([]);
  });
  it("company representatives see their company and cannot recover candidate IDs from events", () => {
    for (const account of data.accounts.filter((a) => a.role === "Representante de empresa")) {
      const view = buildWorkspace(data, account.id, 0, [], TODAY);
      expect(view.vacancies.every((v) => v.companyId === account.scope)).toBe(true);
      expect(view.applications.every((a) => a.companyId === account.scope && a.candidateId === null)).toBe(true);
      expect(view.applications.flatMap((a) => a.events).some((e) => e.actorId?.startsWith("CAN-"))).toBe(false);
      expect(view.applications.some((a) => a.allowedActions.includes("change_state"))).toBe(false);
    }
  });
  it("orientador sees only the assigned candidate range", () => {
    const view = buildWorkspace(data, "USR-051", 0, [], TODAY);
    expect(view.applications.every((a) => a.candidateId! >= "CAN-0025" && a.candidateId! <= "CAN-0044")).toBe(true);
    expect(view.applications.some((a) => a.allowedActions.includes("change_state"))).toBe(false);
  });
  it("reviewers require a persisted review flag AND subportfolio; inference never grants access", () => {
    for (const account of data.accounts.filter((a) => a.role === "Revisor humano")) {
      const view = buildWorkspace(data, account.id, 0, [], TODAY);
      expect(view.applications.every((a) => data.applications.find((raw) => raw.id === a.id)?.requiresReview)).toBe(true);
      expect(view.applications.every((a) => !a.allowedActions.includes("change_state") && !a.allowedActions.includes("correct_state"))).toBe(true);
    }
    const partial = buildWorkspace(data, "USR-056", 0, [], TODAY);
    expect(partial.applications.every((a) => a.requirementsMet === "Parcial")).toBe(true);
    expect(buildWorkspace(data, "USR-058", 0, [], TODAY).applications.some((a) => a.id === "POS-0037")).toBe(false);
  });
  it("admin has technical visibility and four+ metrics but no selection authority", () => {
    const view = buildWorkspace(data, "USR-047", 0, [], TODAY);
    expect(view.applications).toHaveLength(500); expect(view.metrics.length).toBeGreaterThanOrEqual(4);
    expect(view.account.permissions.changeState).toBe(false);
    expect(view.applications.every((a) => !a.allowedActions.includes("change_state") && !a.allowedActions.includes("correct_state"))).toBe(true);
    expect(view.integrity.some((s) => s.title === "15 eventos sin actor")).toBe(true);
  });
});

describe("durable audited actions", () => {
  it("persists authorized transition with server actor, previous state, new state and date, without changing CSV", async () => {
    const file = path.join(process.cwd(), "data/skill-path/source/postulaciones.csv");
    const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex"); const original = hash(await readFile(file));
    const { store, folder } = await testStore(); const result = await store.act(command()); expect(result.version).toBe(1);
    const reopened = new SkillPathStore({ ledgerRoot: folder, now: () => NOW });
    const application = (await reopened.workspace("USR-025")).applications.find((a) => a.id === "POS-0242")!;
    expect(application.state).toBe("Entrevista");
    const event = application.events.at(-1)!;
    expect(event).toMatchObject({ type: "Cambio de etapa", actorId: "REC-001", previousState: "Preseleccionada", newState: "Entrevista", origin: "Manual", at: TODAY });
    expect(hash(await readFile(file))).toBe(original);
  });
  it("replays idempotent requests once and rejects reuse with different content", async () => {
    const { store } = await testStore(); await store.act(command());
    expect((await store.act(command())).replayed).toBe(true);
    await expect(store.act(command({ note: "Un motivo distinto e incompatible." }))).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    expect((await store.workspace("USR-025")).version).toBe(1);
  });
  it("serializes concurrent writes and rejects stale versions", async () => {
    const { store } = await testStore();
    const results = await Promise.allSettled([store.act(command()), store.act(command({ idempotencyKey: "test-concurrent-00002" }))]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected").map((r) => (r as PromiseRejectedResult).reason.code)).toEqual(["VERSION_CONFLICT"]);
    expect((await store.workspace("USR-025")).version).toBe(1);
  });
  it("blocks cross-account and out-of-portfolio mutations even with a write permission", async () => {
    const { store } = await testStore();
    await expect(store.act(command({ applicationId: "POS-0001" }))).rejects.toMatchObject({ status: 403 });
    await expect(store.act(command({ accountId: "USR-001", applicationId: "POS-0221" }))).rejects.toMatchObject({ code: "FORBIDDEN_ACTION" });
    await expect(store.act(command({ accountId: "USR-047" }))).rejects.toMatchObject({ code: "FORBIDDEN_ACTION" });
    expect((await store.workspace("USR-025")).version).toBe(0);
  });
  it("never permits an automated adverse transition or an unexpected stage jump", async () => {
    const { store } = await testStore();
    await expect(store.act(command({ newState: "Descartada", humanConfirmed: false }))).rejects.toMatchObject({ code: "INVALID_ACTION" });
    await expect(store.act(simple("remind", { newState: "Descartada" }))).rejects.toMatchObject({ code: "INVALID_ACTION" });
    await expect(store.act(command({ newState: "Contratada" }))).rejects.toMatchObject({ code: "INVALID_ACTION" });
  });
  it("manual correction preserves the original and prior new events", async () => {
    const { store } = await testStore(); const originalCount = (await store.workspace("USR-025")).applications.find((a) => a.id === "POS-0242")!.events.length;
    await store.act(command()); await store.act(command({ action: "correct_state", newState: "En revisión", expectedVersion: 1, idempotencyKey: "test-correction-00002" }));
    const application = (await store.workspace("USR-025")).applications.find((a) => a.id === "POS-0242")!;
    expect(application.events.length).toBe(originalCount + 2); expect(application.events.at(-1)).toMatchObject({ type: "Corrección manual", previousState: "Entrevista", newState: "En revisión" });
  });
  it("candidate correction requests do not alter a selection decision", async () => {
    const { store } = await testStore();
    await store.act(simple("request_correction", { accountId: "USR-001", applicationId: "POS-0001" }));
    const view = await store.workspace("USR-001"); const application = view.applications.find((a) => a.id === "POS-0001")!;
    expect(application.state).toBe("Recibida"); expect(application.events).toEqual([]); expect(application.requests).toHaveLength(1);
    expect(application.requests[0].status).toBe("pending");
    await expect(store.act(simple("request_correction", { accountId: "USR-001", applicationId: "POS-0002", expectedVersion: 1, idempotencyKey: "test-request-bad-0002" }))).rejects.toMatchObject({ status: 403 });
  });
  it("referral is audited and does not change the application state", async () => {
    const { store } = await testStore(); await store.act(simple("refer_review"));
    const view = await store.workspace("USR-025"); const application = view.applications.find((a) => a.id === "POS-0242")!;
    expect(application.state).toBe("Preseleccionada"); expect(application.requiresReview).toBe(true);
    expect(application.events.at(-1)?.type).toBe("Derivación a revisión humana");
  });
  it("a reviewer documents review but cannot use it to change state", async () => {
    const { store } = await testStore(); const before = (await store.workspace("USR-056")).applications[0];
    await expect(store.act(command({ accountId: "USR-056", applicationId: before.id }))).rejects.toMatchObject({ status: 403 });
    await store.act(simple("resolve_review", { accountId: "USR-056", applicationId: before.id, resolution: "needs_information" }));
    const after = (await store.workspace("USR-056")).applications.find((a) => a.id === before.id)!;
    expect(after.state).toBe(before.state); expect(after.reviewAttended).toBe(true); expect(after.requiresReview).toBe(true);
  });
  it("recorders are idempotent per application/day and do not manufacture fresh activity", async () => {
    const { store } = await testStore(); const before = (await store.workspace("USR-025")).applications.find((a) => a.id === "POS-0242")!;
    await store.act(simple("remind"));
    const again = await store.act(simple("remind", { expectedVersion: 1, idempotencyKey: "test-reminder-again-00002" }));
    expect(again.replayed).toBe(true);
    const after = (await store.workspace("USR-025")).applications.find((a) => a.id === "POS-0242")!;
    expect(after.state).toBe(before.state); expect(after.lastActivityAt).toBe(before.lastActivityAt); expect(after.communication).toEqual(before.communication);
    expect(after.events.filter((e) => e.addedInDemo)).toHaveLength(1);
  });
  it("company requests do not close a vacancy; assigned recruiter can act with explicit confirmation", async () => {
    const { store } = await testStore();
    await store.act(simple("request_vacancy_close", { accountId: "USR-035", applicationId: undefined, vacancyId: "VAC-001" }));
    expect((await store.workspace("USR-035")).vacancies.find((v) => v.id === "VAC-001")!.state).toBe("Activa");
    await expect(store.act(simple("close_vacancy", { accountId: "USR-035", applicationId: undefined, vacancyId: "VAC-001", expectedVersion: 1, humanConfirmed: true }))).rejects.toMatchObject({ status: 403 });
    await store.act(simple("close_vacancy", { applicationId: undefined, vacancyId: "VAC-001", expectedVersion: 1, humanConfirmed: true }));
    const view = await store.workspace("USR-025"); expect(view.vacancies[0].state).toBe("Cerrada"); expect(view.applications).toHaveLength(5); expect(view.requests[0].status).toBe("attended");
    expect(view.applications.find((a) => a.id === "POS-0242")!.state).toBe("Preseleccionada");
  });
  it("field corrections are typed and cannot assign sensitive or arbitrary fields", async () => {
    const { store } = await testStore();
    await expect(store.act({ ...simple("correct_information"), field: "edad", value: "42" })).rejects.toMatchObject({ code: "INVALID_ACTION" });
    await expect(store.act(simple("correct_information", { field: "fecha_ultima_comunicacion", value: "2030-01-01" }))).rejects.toMatchObject({ code: "INVALID_ACTION" });
    await expect(store.act(simple("correct_information", { accountId: "USR-047", field: "requisitos_cumplidos", value: "No" }))).rejects.toMatchObject({ status: 403 });
    await store.act(simple("correct_information", { field: "canal_comunicacion", value: "Mensajería de plataforma" }));
    expect((await store.workspace("USR-025")).applications.find((a) => a.id === "POS-0242")!.communication.channel).toBe("Mensajería de plataforma");
  });
  it("fails closed on corrupt persisted audit data instead of erasing it", async () => {
    const { store, folder } = await testStore(); const file = path.join(folder, "ledger.json"); await writeFile(file, "{broken");
    await expect(store.workspace("USR-001")).rejects.toMatchObject({ code: "LEDGER_INVALID" });
    expect(await readFile(file, "utf8")).toBe("{broken");
  });
  it("forged actor and timestamp fields are rejected; actor is always derived by server", async () => {
    const { store, folder } = await testStore(); await expect(store.act({ ...command(), actorId: "ADM-001", at: "2026-01-01" })).rejects.toMatchObject({ code: "INVALID_ACTION" });
    await store.act(command()); const ledger = JSON.parse(await readFile(path.join(folder, "ledger.json"), "utf8")) as { entries: LedgerEntry[] };
    expect(ledger.entries[0].actorId).toBe("REC-001"); expect(ledger.entries[0].at).toBe(NOW.toISOString());
  });
});

describe("API input boundary", () => {
  it("rejects cross-origin action submission", async () => {
    await expect(readActionBody(new Request("http://localhost:3000/api/skill-path/actions", { method: "POST", headers: { origin: "https://attacker.invalid", "content-type": "application/json" }, body: JSON.stringify(command()) }))).rejects.toMatchObject({ status: 403 });
  });
  it("accepts only bounded JSON with same origin", async () => {
    const headers = { origin: "http://localhost:3000", "content-type": "application/json" };
    expect(await readActionBody(new Request("http://localhost:3000/api/skill-path/actions", { method: "POST", headers, body: JSON.stringify(command()) }))).toEqual(command());
    await expect(readActionBody(new Request("http://localhost:3000/api/skill-path/actions", { method: "POST", headers, body: "x".repeat(9000) }))).rejects.toMatchObject({ status: 413 });
    await expect(readActionBody(new Request("http://localhost:3000/api/skill-path/actions", { method: "POST", headers, body: "bad JSON" }))).rejects.toMatchObject({ code: "INVALID_JSON" });
  });
});
