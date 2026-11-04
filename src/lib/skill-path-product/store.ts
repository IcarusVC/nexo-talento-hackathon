import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { accountFor, chileDate, initialState, jobOpen, managesJob, visibleEvidence, workspace, type ProductState, type StoredAttachment, type StoredAudit } from "./engine";
import { ACCOUNTS } from "./seed";
import { actionSchema, normalize, ProductError, requireCondition } from "./validation";
import { PRODUCT_STAGES, type ProductActionRequest, type ProductActionResult, type ProductWorkspace } from "./types";

const runtimeState = globalThis as typeof globalThis & { __skillPathProductQueues?: Map<string, Promise<unknown>> };
const queues = runtimeState.__skillPathProductQueues ??= new Map<string, Promise<unknown>>();
export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
function newId(prefix: string): string { return `${prefix}-${randomUUID()}`; }
function decodeAttachment(input: { name: string; mimeType: string; base64: string }, evidenceId: string): StoredAttachment {
  const bytes = Buffer.from(input.base64, "base64");
  requireCondition(bytes.length > 0 && bytes.length <= MAX_ATTACHMENT_BYTES && bytes.toString("base64") === input.base64, "El archivo debe tener entre 1 byte y 2 MB y una codificación válida.", "INVALID_ATTACHMENT", 400);
  const magicMatches = input.mimeType === "application/pdf" ? bytes.subarray(0, 5).toString() === "%PDF-" : input.mimeType === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : input.mimeType === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : !bytes.includes(0) && Buffer.from(bytes.toString("utf8")).equals(bytes);
  requireCondition(magicMatches, "El contenido del archivo no coincide con su formato declarado.", "INVALID_ATTACHMENT", 400);
  const extension = path.extname(input.name).toLowerCase();
  const allowed = input.mimeType === "application/pdf" ? [".pdf"] : input.mimeType === "image/png" ? [".png"] : input.mimeType === "image/jpeg" ? [".jpg", ".jpeg"] : [".txt"];
  requireCondition(allowed.includes(extension), "La extensión y el formato del archivo deben coincidir.", "INVALID_ATTACHMENT", 400);
  return { id: newId("SP-FILE"), evidenceId, name: input.name, mimeType: input.mimeType, size: bytes.length, base64: input.base64 };
}
function readState(value: unknown): ProductState {
  if (!value || typeof value !== "object") throw new ProductError("STATE_INVALID", "El almacenamiento necesita revisión; no se sobrescribió.", 503);
  const state = value as ProductState;
  if (state.schemaVersion !== 1 || !Number.isInteger(state.version) || state.version < 0 || !["companies", "jobs", "profiles", "evidence", "applications", "offerings", "enrollments", "attachments", "audit", "requests"].every((key) => Array.isArray(state[key as keyof ProductState]))) throw new ProductError("STATE_INVALID", "El almacenamiento necesita revisión; no se sobrescribió.", 503);
  if (!ACCOUNTS.filter((a) => a.role === "candidate").every((a) => state.profiles.some((p) => p.accountId === a.id))) throw new ProductError("STATE_INVALID", "Faltan perfiles de demostración; requiere revisión.", 503);
  return state;
}
export class ProductStore {
  private root: string;
  private file: string;
  private now: () => Date;
  constructor(options: { root?: string; now?: () => Date } = {}) { this.root = options.root ?? path.join(process.cwd(), ".local", "skill-path-product"); this.file = path.join(this.root, "state.json"); this.now = options.now ?? (() => new Date()); }
  private async load(): Promise<ProductState> {
    try { return readState(JSON.parse(await readFile(this.file, "utf8"))); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return initialState(); if (error instanceof ProductError) throw error; throw new ProductError("STATE_UNAVAILABLE", "No se puede leer el almacenamiento; los registros se conservan para revisión.", 503); }
  }
  private async save(state: ProductState): Promise<void> { await mkdir(this.root, { recursive: true }); const temporary = path.join(this.root, `state-${randomUUID()}.tmp`); await writeFile(temporary, JSON.stringify(state), { encoding: "utf8", mode: 0o600 }); await rename(temporary, this.file); }
  async getWorkspace(accountId: string): Promise<ProductWorkspace> { return workspace(await this.load(), accountId, this.now()); }
  async getAttachment(accountId: string, attachmentId: string): Promise<StoredAttachment> { const state = await this.load(); const account = accountFor(accountId); const file = state.attachments.find((a) => a.id === attachmentId); requireCondition(file && visibleEvidence(state, account).some((e) => e.id === file.evidenceId), "No tienes acceso a ese adjunto."); return file; }
  async act(raw: unknown): Promise<ProductActionResult> {
    const validated = actionSchema.safeParse(raw); if (!validated.success) throw new ProductError("INVALID_INPUT", validated.error.issues[0]?.message ?? "Revisa los campos enviados.");
    const input: ProductActionRequest = validated.data; const key = path.resolve(this.root); const previous = queues.get(key) ?? Promise.resolve();
    const task = previous.catch(() => undefined).then(() => this.apply(input)); queues.set(key, task); try { return await task; } finally { if (queues.get(key) === task) queues.delete(key); }
  }
  private async apply(input: ProductActionRequest): Promise<ProductActionResult> {
    const account = accountFor(input.accountId); const state = await this.load(); const payload = input.payload; const now = this.now(); const at = now.toISOString();
    const hash = createHash("sha256").update(JSON.stringify(payload)).digest("hex"); const previous = state.requests.find((r) => r.accountId === account.id && r.key === input.idempotencyKey);
    if (previous) { requireCondition(previous.hash === hash, "Esta clave ya se utilizó para otra acción.", "IDEMPOTENCY_CONFLICT", 409); return previous.result; }
    requireCondition(input.expectedVersion === state.version, "La información cambió. Actualiza la vista antes de volver a enviar.", "VERSION_CONFLICT", 409);
    let targetId = account.id; let message = "Cambio guardado."; let summary = ""; const scope: Pick<StoredAudit, "candidateId" | "companyId" | "institutionId"> = {};
    const candidate = () => { requireCondition(account.role === "candidate", "Esta acción corresponde al candidato."); scope.candidateId = account.id; return state.profiles.find((p) => p.accountId === account.id)!; };
    switch (payload.type) {
      case "save_profile": { const profile = candidate(); Object.assign(profile, { headline: payload.headline, bio: payload.bio, skills: payload.skills, availabilityHours: payload.availabilityHours }); message = "Perfil guardado. Las habilidades declaradas siguen pendientes de acreditación."; break; }
      case "save_goal": { const profile = candidate(); const job = payload.jobId ? state.jobs.find((j) => j.id === payload.jobId && (j.state === "Activa" || state.applications.some((a) => a.candidateId === account.id && a.jobId === j.id))) : null; if (payload.jobId) requireCondition(job, "El cargo elegido no está disponible.", "JOB_NOT_FOUND", 404); profile.goal = { title: job?.title ?? payload.title, jobId: payload.jobId, skills: job ? [...job.requiredSkills] : payload.skills }; message = "Meta guardada. Ya puedes contrastarla con tu evidencia y formación."; break; }
      case "add_evidence": {
        candidate(); if (payload.companyId) requireCondition(state.companies.some((c) => c.id === payload.companyId), "Selecciona una empresa de demostración.", "COMPANY_NOT_FOUND", 404);
        requireCondition(state.evidence.filter((e) => e.candidateId === account.id).length < 100, "La demo admite hasta 100 evidencias por perfil.", "LIMIT_REACHED", 400);
        targetId = newId("SP-EVIDENCE"); const attachment = payload.attachment ? decodeAttachment(payload.attachment, targetId) : null;
        if (attachment) { requireCondition(state.attachments.reduce((sum, f) => sum + f.size, 0) + attachment.size <= 50 * 1024 * 1024, "Se alcanzó el límite local de adjuntos de la demo.", "LIMIT_REACHED", 400); state.attachments.push(attachment); }
        state.evidence.push({ id: targetId, candidateId: account.id, kind: payload.kind, title: payload.title, description: payload.description, skills: payload.skills, url: payload.url, companyId: payload.companyId, startedAt: payload.startedAt, endedAt: payload.endedAt, status: "pending", reviewerId: null, reviewedAt: null, reviewNote: null, createdAt: at, attachment: attachment ? { id: attachment.id, name: attachment.name, mimeType: attachment.mimeType, size: attachment.size } : null });
        if (payload.companyId) scope.companyId = payload.companyId; message = payload.kind === "experience" ? "Experiencia enviada a la bandeja del empleador de demostración. Aún no está acreditada." : "Evidencia guardada como pendiente de revisión."; break;
      }
      case "review_evidence": {
        const evidence = state.evidence.find((e) => e.id === payload.evidenceId); requireCondition(evidence && ["recruiter", "supervisor"].includes(account.role) && evidence.kind === "experience" && evidence.companyId === account.companyId, "Sólo el empleador vinculado puede acreditar esta experiencia.");
        summary = `Experiencia: ${evidence.status} → ${payload.status}. ${payload.note}`; evidence.status = payload.status; evidence.reviewerId = account.id; evidence.reviewedAt = at; evidence.reviewNote = payload.note; targetId = evidence.id; scope.companyId = account.companyId; scope.candidateId = evidence.candidateId; message = payload.status === "verified" ? "Experiencia acreditada por el empleador de demostración." : "Se registró que faltan antecedentes para acreditar la experiencia."; break;
      }
      case "apply": {
        candidate(); const job = state.jobs.find((j) => j.id === payload.jobId); requireCondition(job && jobOpen(job, now), "La vacante está cerrada, pausada o vencida.", "JOB_UNAVAILABLE", 409);
        requireCondition(!state.applications.some((a) => a.candidateId === account.id && a.jobId === job.id), "Ya tienes una postulación para este cargo.", "ALREADY_APPLIED", 409);
        targetId = newId("SP-APP"); state.applications.push({ id: targetId, candidateId: account.id, jobId: job.id, stage: "Recibida", createdAt: at, updatedAt: at, history: [{ at, actorId: account.id, from: null, to: "Recibida", note: "Postulación registrada por el candidato en la demostración. Evaluación humana pendiente." }] }); scope.companyId = job.companyId; message = "Postulación registrada en la demo. Puedes seguir sus etapas."; break;
      }
      case "create_job": {
        requireCondition(["recruiter", "supervisor"].includes(account.role) && account.companyId, "Sólo una empresa puede publicar vacantes.");
        const recruiterId = payload.recruiterId ?? (account.role === "recruiter" ? account.id : ACCOUNTS.find((a) => a.role === "recruiter" && a.companyId === account.companyId)?.id);
        requireCondition(recruiterId && ACCOUNTS.some((a) => a.id === recruiterId && a.role === "recruiter" && a.companyId === account.companyId) && (account.role === "supervisor" || recruiterId === account.id), "El responsable debe ser un reclutador autorizado de tu empresa.");
        requireCondition(payload.closesAt >= chileDate(now), "La fecha de cierre no puede estar en el pasado.", "INVALID_DATE", 400);
        targetId = newId("SP-JOB"); state.jobs.push({ id: targetId, companyId: account.companyId, recruiterId, title: payload.title, description: payload.description, requiredSkills: payload.requiredSkills, recommendedSkills: payload.recommendedSkills, location: payload.location, modality: payload.modality, hoursPerWeek: payload.hoursPerWeek, closesAt: payload.closesAt, state: "Activa", createdAt: at, source: "demo" }); scope.companyId = account.companyId; message = "Vacante de demostración publicada y asignada."; break;
      }
      case "move_application": {
        const application = state.applications.find((a) => a.id === payload.applicationId); const job = state.jobs.find((j) => j.id === application?.jobId); requireCondition(application && job && managesJob(account, job), "No puedes modificar una postulación fuera de tus procesos.");
        requireCondition(payload.humanConfirmed, "Confirma que una persona revisó y autorizó la decisión.", "HUMAN_CONFIRMATION_REQUIRED", 400);
        const previousStage = application.stage; const fromIndex = PRODUCT_STAGES.indexOf(previousStage); const toIndex = PRODUCT_STAGES.indexOf(payload.stage);
        requireCondition(payload.stage !== previousStage, "La postulación ya está en esa etapa.", "UNCHANGED_STAGE", 409);
        requireCondition(payload.stage === "Descartada" || toIndex <= fromIndex + 1, "Avanza a la etapa siguiente o registra una corrección a una etapa anterior.", "INVALID_TRANSITION", 400);
        application.stage = payload.stage; application.updatedAt = at; const correction = toIndex < fromIndex; const note = `${correction ? "Corrección manual: " : ""}${payload.note}`;
        application.history.push({ at, actorId: account.id, from: previousStage, to: payload.stage, note }); targetId = application.id; scope.companyId = job.companyId; scope.candidateId = application.candidateId; summary = `${previousStage} → ${payload.stage}. ${note}`; message = "Etapa actualizada con decisión humana e historial conservado."; break;
      }
      case "set_company_skills": { requireCondition(account.role === "supervisor", "Sólo el supervisor define las habilidades de la empresa."); const company = state.companies.find((c) => c.id === account.companyId)!; company.requiredSkills = payload.requiredSkills; company.recommendedSkills = payload.recommendedSkills; targetId = company.id; scope.companyId = company.id; message = "Piso y habilidades recomendadas guardados. Son visibles para los candidatos; no descartan automáticamente."; break; }
      case "save_offering": {
        requireCondition(account.role === "institution" && account.institutionId, "Sólo una institución puede gestionar su catálogo."); const existing = payload.offering.id ? state.offerings.find((o) => o.id === payload.offering.id) : null;
        if (payload.offering.id) requireCondition(existing && existing.institutionId === account.institutionId, "No puedes editar programas de otra institución.");
        if (existing && state.enrollments.some((e) => e.offeringId === existing.id)) requireCondition(JSON.stringify(existing.skills.map(normalize).sort()) === JSON.stringify(payload.offering.skills.map(normalize).sort()) && existing.kind === payload.offering.kind && JSON.stringify(existing.rubric) === JSON.stringify(payload.offering.rubric), "Este programa ya tiene solicitudes. Conserva sus habilidades y criterios; crea otro para cambiar la evaluación.", "OFFERING_IN_USE", 409);
        targetId = existing?.id ?? newId("SP-OFFERING"); const value = { ...payload.offering, id: targetId, institutionId: account.institutionId, source: "demo" as const }; if (existing) Object.assign(existing, value); else state.offerings.push(value); scope.institutionId = account.institutionId; message = "Oferta formativa guardada como demostración del convenio ficticio."; break;
      }
      case "enroll": {
        candidate(); const offering = state.offerings.find((o) => o.id === payload.offeringId && o.published); requireCondition(offering, "Esta oferta formativa no está publicada.", "OFFERING_UNAVAILABLE", 404);
        requireCondition(!offering.startsAt || new Date(offering.startsAt) >= now, "La fecha de esta actividad ya pasó.", "OFFERING_EXPIRED", 409);
        requireCondition(!state.enrollments.some((e) => e.candidateId === account.id && e.offeringId === offering.id), "Ya registraste una solicitud para esta oferta.", "ALREADY_ENROLLED", 409);
        requireCondition(offering.capacity === null || state.enrollments.filter((e) => e.offeringId === offering.id).length < offering.capacity, "No quedan cupos de demostración disponibles.", "OFFERING_FULL", 409);
        targetId = newId("SP-ENROLL"); state.enrollments.push({ id: targetId, candidateId: account.id, offeringId: offering.id, goal: payload.goal, status: "requested", createdAt: at, evaluation: null }); scope.institutionId = offering.institutionId; message = "Solicitud guardada en la demo; no equivale a matrícula ni envía una postulación oficial."; break;
      }
      case "evaluate_enrollment": {
        const enrollment = state.enrollments.find((e) => e.id === payload.enrollmentId); const offering = state.offerings.find((o) => o.id === enrollment?.offeringId);
        requireCondition(enrollment && offering && account.role === "institution" && offering.institutionId === account.institutionId, "Sólo la institución responsable puede evaluar esta solicitud.");
        requireCondition(enrollment.status !== "completed", "La evaluación final ya fue registrada; su evidencia se conserva.", "EVALUATION_FINAL", 409);
        const offeringSkills = new Set(offering.skills.map(normalize)); requireCondition(payload.demonstratedSkills.every((s) => offeringSkills.has(normalize(s))), "Sólo puedes acreditar habilidades incluidas en esta oferta.", "INVALID_SKILLS", 400);
        requireCondition(payload.completed || payload.demonstratedSkills.length === 0, "Una revisión sin finalización no puede acreditar habilidades.", "EVALUATION_INCOMPLETE", 400);
        requireCondition(!payload.completed || payload.demonstratedSkills.length > 0, "Selecciona las habilidades observadas al completar una evaluación.", "MISSING_EVALUATION", 400);
        enrollment.status = payload.completed ? "completed" : "reviewed"; enrollment.evaluation = { reviewerId: account.id, at, note: payload.note, demonstratedSkills: payload.demonstratedSkills }; targetId = enrollment.id; scope.institutionId = account.institutionId; scope.candidateId = enrollment.candidateId;
        if (payload.completed) state.evidence.push({ id: newId("SP-EVIDENCE"), candidateId: enrollment.candidateId, kind: offering.kind === "activity" ? "activity" : "achievement", title: offering.title, description: `Evaluación de demostración: ${payload.note}`, skills: payload.demonstratedSkills, url: offering.url, companyId: null, startedAt: null, endedAt: null, status: "verified", reviewerId: account.id, reviewedAt: at, reviewNote: payload.note, createdAt: at, attachment: null, enrollmentId: enrollment.id });
        message = payload.completed ? "Evaluación de demostración registrada. Sólo las habilidades observadas quedaron acreditadas." : "Revisión registrada; no acredita habilidades todavía."; break;
      }
    }
    state.version += 1; state.audit.push({ id: newId("SP-AUDIT"), at, actorId: account.id, action: payload.type, targetId, summary: summary || message, ...scope });
    const result: ProductActionResult = { ok: true, version: state.version, message, targetId }; state.requests.push({ accountId: account.id, key: input.idempotencyKey, hash, result }); await this.save(state); return result;
  }
}
export const productStore = new ProductStore();
