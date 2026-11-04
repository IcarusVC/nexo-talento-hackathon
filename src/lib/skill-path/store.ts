import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { loadDataset, type Dataset, type ProcessEvent } from "./data";
import { buildWorkspace, chileToday, SkillPathError, validDate } from "./engine";
import { ACTION_TYPES, APPLICATION_STATES, type ActionInput, type ActionResponse, type RequestView } from "./types";

export const actionSchema = z.object({
  accountId: z.string().regex(/^USR-\d{3}$/), action: z.enum(ACTION_TYPES),
  applicationId: z.string().regex(/^POS-\d{4}$/).optional(), vacancyId: z.string().regex(/^VAC-\d{3}$/).optional(),
  expectedVersion: z.number().int().min(0), idempotencyKey: z.string().min(12).max(100).regex(/^[a-zA-Z0-9_-]+$/),
  note: z.string().trim().min(8).max(800), newState: z.enum(APPLICATION_STATES).optional(), humanConfirmed: z.boolean().optional(),
  resolution: z.enum(["reviewed", "needs_information"]).optional(),
  field: z.enum(["requisitos_cumplidos", "fuente_estado", "fecha_ultima_comunicacion", "canal_comunicacion"]).optional(),
  value: z.string().trim().max(80).nullable().optional(),
}).strict();
export interface LedgerEntry { sequence: number; id: string; at: string; day: string; actorId: string; role: string; previousState: string | null; newState: string | null; origin: "Manual" | "Sistema"; input: ActionInput }
interface Ledger { schemaVersion: 1; entries: LedgerEntry[] }
interface State { dataset: Dataset; requests: RequestView[] }
interface StoreOptions { ledgerRoot?: string; now?: () => Date }
const runtimeState = globalThis as typeof globalThis & { __skillPathQueues?: Map<string, Promise<unknown>> };
const queues = runtimeState.__skillPathQueues ??= new Map();
function serialize<T>(key: string, work: () => Promise<T>): Promise<T> {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(work); queues.set(key, next);
  void next.finally(() => { if (queues.get(key) === next) queues.delete(key); }).catch(() => undefined);
  return next;
}
function eventFor(entry: LedgerEntry, applicationId: string, type: string, state: string, affectsState: boolean): ProcessEvent {
  return { id: `SP-EVT-${String(entry.sequence).padStart(8, "0")}-${applicationId}`, applicationId, type, actorType: entry.input.action === "remind" ? "Sistema" : entry.role, actorId: entry.actorId, at: entry.day, previousState: entry.previousState ?? state, newState: entry.newState ?? state, origin: entry.origin, communicated: false, requiresReview: entry.input.action === "refer_review", updatedAt: entry.day, note: entry.input.note, addedInDemo: true, affectsState };
}
export function replay(base: Dataset, entries: LedgerEntry[]): State {
  const dataset = structuredClone(base); const requests: RequestView[] = [];
  for (const entry of entries) {
    const input = entry.input;
    const application = dataset.applications.find((a) => a.id === input.applicationId);
    const vacancy = dataset.vacancies.find((v) => v.id === input.vacancyId);
    if (application) {
      let type = "Anotación manual"; let affectsState = false;
      switch (input.action) {
        case "change_state": case "correct_state":
          application.state = input.newState!; application.updatedAt = entry.day; application.source = "Empresa";
          type = input.action === "change_state" ? "Cambio de etapa" : "Corrección manual"; affectsState = true; break;
        case "request_correction":
          type = "Solicitud de corrección";
          requests.push({ id: entry.id, applicationId: application.id, vacancyId: null, type, at: entry.at, actorId: entry.actorId, note: input.note, status: "pending" }); break;
        case "refer_review":
          type = "Derivación a revisión humana"; application.requiresReview = true; application.reviewAttended = false;
          requests.push({ id: entry.id, applicationId: application.id, vacancyId: null, type, at: entry.at, actorId: entry.actorId, note: input.note, status: "pending" }); break;
        case "resolve_review":
          type = "Revisión humana documentada"; application.reviewAttended = true;
          application.requiresReview = input.resolution !== "reviewed";
          if (input.resolution === "reviewed") for (const request of requests) if (request.applicationId === application.id) request.status = "attended";
          break;
        case "remind": type = "Recordatorio automático"; break;
        case "correct_information": {
          type = "Corrección manual";
          const value = input.value || null;
          if (input.field === "requisitos_cumplidos") application.requirementsMet = value;
          if (input.field === "fuente_estado") application.source = value;
          if (input.field === "fecha_ultima_comunicacion") application.communicatedAt = value;
          if (input.field === "canal_comunicacion") application.channel = value;
          // Correcting contact metadata does not manufacture recruitment activity.
          break;
        }
      }
      dataset.events.push(eventFor(entry, application.id, type, application.state, affectsState));
    }
    if (vacancy) {
      if (input.action === "request_vacancy_pause" || input.action === "request_vacancy_close") requests.push({ id: entry.id, applicationId: null, vacancyId: vacancy.id, type: input.action === "request_vacancy_pause" ? "Solicitud de pausa de vacante" : "Solicitud de cierre de vacante", at: entry.at, actorId: entry.actorId, note: input.note, status: "pending" });
      if (input.action === "pause_vacancy" || input.action === "close_vacancy") {
        vacancy.state = input.action === "pause_vacancy" ? "Pausada" : "Cerrada"; vacancy.updatedAt = entry.day;
        for (const application of dataset.applications.filter((a) => a.vacancyId === vacancy.id)) {
          const event = eventFor(entry, application.id, vacancy.state === "Pausada" ? "Vacante pausada" : "Vacante cerrada", application.state, false);
          event.previousState = application.state; event.newState = application.state; dataset.events.push(event);
        }
        for (const request of requests) if (request.vacancyId === vacancy.id && (input.action === "pause_vacancy" && request.type === "Solicitud de pausa de vacante" || input.action === "close_vacancy" && request.type === "Solicitud de cierre de vacante")) request.status = "attended";
      }
    }
  }
  return { dataset, requests };
}
function invalid(message: string): never { throw new SkillPathError("INVALID_ACTION", message); }
export class SkillPathStore {
  private readonly file: string;
  private readonly now: () => Date;
  constructor(options: StoreOptions = {}) {
    this.file = path.join(options.ledgerRoot ?? path.join(process.cwd(), ".local", "skill-path"), "ledger.json");
    this.now = options.now ?? (() => new Date());
  }
  private async ledger(): Promise<Ledger> {
    let text: string;
    try { text = await readFile(this.file, "utf8"); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { schemaVersion: 1, entries: [] }; throw error; }
    try {
      const value: unknown = JSON.parse(text);
      if (!value || typeof value !== "object") throw new Error();
      const ledger = value as Ledger;
      if (ledger.schemaVersion !== 1 || !Array.isArray(ledger.entries) || ledger.entries.length > 50000) throw new Error();
      ledger.entries.forEach((entry, index) => {
        if (entry.sequence !== index + 1 || !validDate(entry.day) || !entry.id || typeof entry.actorId !== "string" || !Number.isFinite(Date.parse(entry.at)) || !actionSchema.safeParse(entry.input).success) throw new Error();
      });
      return ledger;
    } catch { throw new SkillPathError("LEDGER_INVALID", "La bitácora local necesita revisión. No se borró ni reinició ningún registro.", 503); }
  }
  async accounts() {
    const dataset = await loadDataset();
    return dataset.accounts.map(({ id, name, role }) => ({ id, name, role }));
  }
  async workspace(accountId: string) {
    if (!/^USR-\d{3}$/.test(accountId)) throw new SkillPathError("UNKNOWN_ACCOUNT", "Selecciona una cuenta ficticia válida.");
    const [base, ledger] = await Promise.all([loadDataset(), this.ledger()]);
    const { dataset, requests } = replay(base, ledger.entries);
    return buildWorkspace(dataset, accountId, ledger.entries.length, requests, chileToday(this.now()));
  }
  async act(raw: unknown): Promise<ActionResponse> {
    const parsed = actionSchema.safeParse(raw);
    if (!parsed.success) invalid("Revisa los campos de la acción y escribe un motivo de 8 a 800 caracteres.");
    const input = parsed.data;
    return serialize(this.file, async () => {
      const [base, ledger] = await Promise.all([loadDataset(), this.ledger()]);
      const existing = ledger.entries.find((e) => e.input.idempotencyKey === input.idempotencyKey);
      if (existing) {
        if (JSON.stringify(existing.input) !== JSON.stringify(input)) throw new SkillPathError("IDEMPOTENCY_CONFLICT", "La clave ya identifica otra acción. Recarga antes de continuar.", 409);
        return { ok: true, version: ledger.entries.length, actionId: existing.id, message: "La acción ya estaba registrada; no se duplicó.", replayed: true };
      }
      const now = this.now(); const today = chileToday(now);
      const { dataset, requests } = replay(base, ledger.entries);
      const workspace = buildWorkspace(dataset, input.accountId, ledger.entries.length, requests, today);
      const isVacancyAction = input.action.includes("vacancy");
      if (isVacancyAction ? !input.vacancyId || input.applicationId : !input.applicationId || input.vacancyId) invalid("La acción debe identificar sólo su vacante o postulación.");
      const application = workspace.applications.find((a) => a.id === input.applicationId);
      const vacancy = workspace.vacancies.find((v) => v.id === input.vacancyId);
      const target = isVacancyAction ? vacancy : application;
      if (!target) throw new SkillPathError("OUT_OF_SCOPE", "No tienes acceso a ese registro.", 403);
      if (!target.allowedActions.includes(input.action)) throw new SkillPathError("FORBIDDEN_ACTION", "Tu cuenta no tiene permiso para esta acción.", 403);
      if (input.expectedVersion !== ledger.entries.length) throw new SkillPathError("VERSION_CONFLICT", "Los datos cambiaron. Recarga y revisa antes de confirmar.", 409);
      const previousState: string | null = application?.state ?? vacancy?.state ?? null;
      let newState = previousState;
      if (input.action === "change_state" || input.action === "correct_state") {
        if (!input.newState || input.humanConfirmed !== true) invalid("Confirma la decisión humana y selecciona un estado.");
        if (input.newState === application!.state) invalid("El nuevo estado debe ser distinto del registrado.");
        if (input.action === "change_state" && !application!.availableTransitions.includes(input.newState)) invalid("La transición no corresponde a esta etapa. Una corrección requiere su acción y motivo propios.");
        newState = input.newState;
      } else if (input.newState !== undefined) invalid("Esta acción no puede cambiar decisiones de selección.");
      if (input.action === "resolve_review" && !input.resolution) invalid("Indica si la revisión fue atendida o necesita más información.");
      if (input.action !== "resolve_review" && input.resolution !== undefined) invalid("La resolución sólo corresponde a revisión humana.");
      if (input.action === "correct_information") {
        if (!input.field || input.value === undefined) invalid("Selecciona el campo permitido y su valor.");
        if (workspace.account.role === "Administrador de plataforma" && input.field === "requisitos_cumplidos") throw new SkillPathError("FORBIDDEN_ACTION", "La administración técnica no evalúa requisitos de candidatos.", 403);
        const value = input.value || null;
        if (input.field === "requisitos_cumplidos" && value !== null && !["Sí", "Parcial", "No"].includes(value)) invalid("El contraste de requisitos admite Sí, Parcial, No o información no disponible.");
        const rawApplication = dataset.applications.find((a) => a.id === input.applicationId)!;
        if (input.field === "requisitos_cumplidos" && value && !dataset.vacancies.find((v) => v.id === rawApplication.vacancyId)?.requirements.length) invalid("Faltan requisitos publicados; no se puede registrar un contraste verificable.");
        if (input.field === "fuente_estado" && value !== null && !["Empresa", "Plataforma", "Sistema"].includes(value)) invalid("La fuente debe ser Empresa, Plataforma o Sistema.");
        if (input.field === "canal_comunicacion" && value !== null && !["Correo electrónico", "Teléfono", "Mensajería de plataforma"].includes(value)) invalid("Selecciona un canal permitido.");
        if (input.field === "fecha_ultima_comunicacion" && value !== null && (!validDate(value) || value < rawApplication.appliedAt || value > today)) invalid("La fecha debe estar entre la postulación y el día actual.");
      } else if (input.field !== undefined || input.value !== undefined) invalid("Esta acción no admite correcciones de campos.");
      if (input.action === "pause_vacancy" || input.action === "close_vacancy") {
        if (!input.humanConfirmed) invalid("Confirma la acción sobre la vacante.");
        newState = input.action === "pause_vacancy" ? "Pausada" : "Cerrada";
        if (vacancy!.state === newState || vacancy!.state === "Cerrada") invalid("La vacante ya está cerrada o en el estado solicitado.");
      }
      if (input.action === "remind") {
        const duplicate = ledger.entries.find((e) => e.day === today && e.input.action === "remind" && e.input.applicationId === input.applicationId);
        if (duplicate) return { ok: true, version: ledger.entries.length, actionId: duplicate.id, message: "Ya hay un recordatorio local para este proceso hoy. No se duplicó ni se envió un mensaje.", replayed: true };
      }
      if (ledger.entries.length >= 50000) throw new SkillPathError("LEDGER_LIMIT", "La bitácora alcanzó el límite de esta demo. Conserva el archivo y solicita revisión.", 409);
      const entry: LedgerEntry = { sequence: ledger.entries.length + 1, id: `SP-ACT-${randomUUID()}`, at: now.toISOString(), day: today, actorId: workspace.account.actorId, role: workspace.account.role, previousState, newState, origin: input.action === "remind" ? "Sistema" : "Manual", input };
      const updated: Ledger = { schemaVersion: 1, entries: [...ledger.entries, entry] };
      await mkdir(path.dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(updated, null, 2), { encoding: "utf8", flag: "wx" });
      await rename(temporary, this.file);
      const messages: Partial<Record<ActionInput["action"], string>> = { request_correction: "Solicitud guardada para un responsable autorizado; no cambia el estado.", refer_review: "Caso derivado a revisión humana. El estado se conserva.", resolve_review: "Revisión documentada. Las inconsistencias que persisten siguen señaladas.", remind: "Recordatorio local registrado. No se envió correo ni se cambió la etapa.", request_vacancy_close: "Solicitud de cierre registrada; la vacante conserva su estado.", request_vacancy_pause: "Solicitud de pausa registrada; la vacante conserva su estado." };
      return { ok: true, version: updated.entries.length, actionId: entry.id, message: messages[input.action] ?? "Cambio registrado con actor, fecha y evidencia previa conservada.", replayed: false };
    });
  }
}
export const skillPathStore = new SkillPathStore();
