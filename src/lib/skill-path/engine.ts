import type { Account, Application, Dataset, ProcessEvent, Vacancy } from "./data";
import { APPLICATION_STATES, type AccountView, type ActionType, type ApplicationState, type ApplicationView, type EventView, type Metric, type RequestView, type Signal, type VacancyView, type WorkspaceView } from "./types";

export const STALE_DAYS = 30;
export function chileToday(now = new Date()): string { return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(now); }
export function validDate(value: string | null | undefined): value is string { return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
export function daysSince(value: string | null, today: string): number | null { return validDate(value) && value <= today ? Math.floor((Date.parse(today) - Date.parse(value)) / 86400000) : null; }
const transitions: Record<ApplicationState, ApplicationState[]> = { Recibida: ["En revisión", "Descartada"], "En revisión": ["Preseleccionada", "Descartada"], Preseleccionada: ["Entrevista", "Descartada"], Entrevista: ["Oferta", "Descartada"], Oferta: ["Contratada", "Descartada"], Descartada: [], Contratada: [] };
const meanings: Record<ApplicationState, string> = { Recibida: "La plataforma registró la postulación.", "En revisión": "Un responsable está verificando antecedentes y requisitos publicados.", Preseleccionada: "La postulación continúa hacia una instancia de evaluación.", Entrevista: "Hay una entrevista registrada como programada o realizada.", Oferta: "La empresa registró una propuesta.", Descartada: "La fuente registra el término del proceso sin contratación; requiere una decisión humana trazable.", Contratada: "La fuente registra una contratación." };
const nextSteps: Record<ApplicationState, string> = { Recibida: "Un responsable debe revisar los antecedentes. Puedes solicitar una aclaración si falta información.", "En revisión": "Espera la revisión del responsable o solicita una aclaración. No hay un resultado nuevo confirmado.", Preseleccionada: "Confirma con el responsable las instrucciones de la siguiente evaluación.", Entrevista: "Revisa fecha, modalidad e instrucciones con el responsable; el estado por sí solo no acredita una cita concreta.", Oferta: "Confirma las condiciones de la propuesta con la empresa.", Descartada: "Puedes solicitar una aclaración o corrección de información. Este es un estado final registrado.", Contratada: "Confirma con la empresa los pasos de incorporación. Este es un estado final registrado." };
function sig(code: string, kind: Signal["kind"], title: string, detail: string): Signal { return { code, kind, title, detail }; }

export function assignedVacancy(account: Account, vacancy: Vacancy): boolean {
  const companies = account.scope.split("|");
  return account.role === "Reclutador" && vacancy.recruiterId === account.actorId && companies.includes(vacancy.companyId);
}
function reviewerPortfolio(account: Account, application: Application): boolean {
  const scopes: Record<string, () => boolean> = {
    "Casos con requisitos Parcial": () => application.requirementsMet === "Parcial",
    "Casos con requisitos No": () => application.requirementsMet === "No",
    "Casos con fuente Empresa": () => application.source === "Empresa",
    "Casos con fuente Plataforma": () => application.source === "Plataforma",
    "Casos con fuente Sistema o incompleta": () => application.source === "Sistema" || !application.source,
  };
  return scopes[account.scope]?.() ?? false;
}
export function canSeeApplication(account: Account, application: Application, dataset: Dataset): boolean {
  const vacancy = dataset.vacancies.find((v) => v.id === application.vacancyId);
  switch (account.role) {
    case "Candidato": return account.actorId === application.candidateId;
    case "Reclutador": return !!vacancy && assignedVacancy(account, vacancy);
    case "Representante de empresa": return !!vacancy && vacancy.companyId === account.scope;
    case "Administrador de plataforma": return account.scope === "Plataforma completa";
    case "Orientador de empleabilidad": {
      const match = /^Candidatos (CAN-\d{4}) a (CAN-\d{4})$/.exec(account.scope);
      return !!match && application.candidateId >= match[1] && application.candidateId <= match[2];
    }
    case "Revisor humano": return account.humanReview && application.requiresReview && reviewerPortfolio(account, application);
    default: return false;
  }
}
export function orderedEvents(events: ProcessEvent[]): ProcessEvent[] { return [...events].sort((a, b) => a.at.localeCompare(b.at) || Number(!!a.addedInDemo) - Number(!!b.addedInDemo) || a.id.localeCompare(b.id)); }
export interface Analysis { signals: Signal[]; stale: boolean; discrepancy: boolean; requiresReview: boolean; lastActivityAt: string | null; daysSinceActivity: number | null; stateKind: "confirmed" | "missing"; communicationConfirmed: boolean; chronologicalEvents: ProcessEvent[] }
export function analyzeApplication(application: Application, dataset: Dataset, today: string): Analysis {
  const events = orderedEvents(dataset.events.filter((e) => e.applicationId === application.id));
  const latestStateEvents = events.filter((e) => e.affectsState !== false && validDate(e.at) && e.at <= today);
  const latest = latestStateEvents.at(-1);
  const lastDay = latest?.at;
  const sameDayStates = latestStateEvents.filter((e) => e.at === lastDay && !e.addedInDemo).map((e) => e.newState);
  const ambiguousOrder = !latest?.addedInDemo && new Set(sameDayStates).size > 1;
  const discrepancy = !!latest && latest.newState !== application.state;
  const sourceConfirmed = ["Empresa", "Plataforma", "Sistema"].includes(application.source ?? "");
  const supportedEvent = !ambiguousOrder && latest?.newState === application.state && !!latest.actorId && !latest.requiresReview;
  const stateKind = sourceConfirmed || supportedEvent ? "confirmed" : "missing";
  // Administrative annotations and reminders do not fabricate fresh recruitment activity.
  const activity = [application.updatedAt, ...events.filter((e) => !e.addedInDemo || e.affectsState !== false).map((e) => e.at)].filter((d): d is string => validDate(d) && d <= today).sort();
  const lastActivityAt = activity.at(-1) ?? null;
  const daysSinceActivity = daysSince(lastActivityAt, today);
  const stale = daysSinceActivity !== null && daysSinceActivity > STALE_DAYS;
  const communicationConfirmed = validDate(application.communicatedAt) && application.communicatedAt >= application.appliedAt && application.communicatedAt <= today && ["Correo electrónico", "Teléfono", "Mensajería de plataforma"].includes(application.channel ?? "");
  const signals: Signal[] = [];
  if (stateKind === "confirmed") signals.push(sig("confirmed_state", "confirmed", "Estado confirmado en la fuente", sourceConfirmed ? `Estado explícito registrado por ${application.source}. La bitácora permite contrastarlo.` : "Un evento verificable respalda el estado; la fuente del registro está vacía y se conserva así."));
  else signals.push(sig("unverified_state", "missing", "Respaldo del estado por confirmar", "El valor registrado se conserva, pero falta una fuente o evento verificable suficiente para confirmarlo."));
  if (!application.source) signals.push(sig("missing_source", "missing", "Fuente no disponible", "La ausencia de fuente no demuestra que el proceso no haya ocurrido."));
  if (!validDate(application.updatedAt)) signals.push(sig("missing_updated_at", "missing", "Fecha de actualización no disponible", "No se reemplaza una fecha vacía por la fecha actual."));
  if (!lastActivityAt) signals.push(sig("missing_activity", "missing", "Actividad por confirmar", "No hay una fecha válida suficiente para calcular antigüedad."));
  if (stale) signals.push(sig("stale", "stale", "Sin actualización reciente", `${daysSinceActivity} días sin actualización ni evento de actividad verificado. El umbral es más de ${STALE_DAYS} días; se conserva el estado.`));
  if (!communicationConfirmed) signals.push(sig("missing_communication", "missing", "Comunicación por confirmar", "Falta una fecha válida o un canal confirmado. No significa que nunca se haya contactado a la persona."));
  if (discrepancy) signals.push(sig("state_discrepancy", "inferred", "Inconsistencia de estado", `El registro indica ${application.state}; el último evento ordenado indica ${latest?.newState}. Se solicita revisión sin reemplazar el estado.`));
  if (ambiguousOrder) signals.push(sig("ambiguous_order", "inferred", "Orden temporal por confirmar", "Hay estados diferentes en eventos del mismo día sin hora. El ID se usa sólo para mostrar un orden estable, no para confirmar qué ocurrió después."));
  const chainBroken = latestStateEvents.some((event, index) => index > 0 && event.previousState && event.previousState !== latestStateEvents[index - 1].newState);
  if (chainBroken) signals.push(sig("broken_chain", "inferred", "Quiebre en la historia del proceso", "Un estado anterior no coincide con el resultado del evento precedente. La evidencia original permanece disponible para revisión."));
  if (events.some((e) => !e.actorId)) signals.push(sig("missing_actor", "missing", "Actor de evento no disponible", "Al menos un evento no identifica a la persona o sistema responsable."));
  if (!dataset.vacancies.some((v) => v.id === application.vacancyId)) signals.push(sig("missing_vacancy", "missing", "Relación de vacante incompleta", "El identificador de vacante no aparece en el catálogo. No se inventan sus datos."));
  if (application.requirementsMet === null) signals.push(sig("missing_requirements", "missing", "Contraste de requisitos no disponible", "Un campo vacío no indica que la persona incumpla los requisitos."));
  if (application.requirementsMet === "No" || application.requirementsMet === "Parcial") signals.push(sig("requirements_review", "inferred", "Contraste de requisitos para revisión", "Revisar únicamente los requisitos publicados y evidencia verificable. Esta señal no cambia la etapa ni descarta a la persona."));
  const unhandledHistory = !application.reviewAttended && (chainBroken || events.some((e) => e.requiresReview || !e.actorId));
  const requiresReview = application.requiresReview || discrepancy || ambiguousOrder || stateKind === "missing" || unhandledHistory;
  return { signals, stale, discrepancy, requiresReview, lastActivityAt, daysSinceActivity, stateKind, communicationConfirmed, chronologicalEvents: events };
}
export function applicationActions(account: Account, application: Application, dataset: Dataset, analysis: Analysis): ActionType[] {
  if (!canSeeApplication(account, application, dataset)) return [];
  if (account.role === "Candidato") return account.correctInformation ? ["request_correction"] : [];
  const actions: ActionType[] = ["refer_review"];
  if (account.role === "Reclutador" && account.changeState) actions.push("change_state");
  if (account.role === "Reclutador" && account.correctInformation && account.changeState) actions.push("correct_state");
  if (["Reclutador", "Administrador de plataforma", "Revisor humano"].includes(account.role) && account.correctInformation) actions.push("correct_information");
  if (account.automate) actions.push("remind");
  if (account.role === "Revisor humano" && account.humanReview && analysis.requiresReview) actions.push("resolve_review");
  return actions;
}
function vacancyActions(account: Account, vacancy: Vacancy): ActionType[] {
  if (account.role === "Representante de empresa" && account.scope === vacancy.companyId) return ["request_vacancy_pause", "request_vacancy_close"];
  if (assignedVacancy(account, vacancy) && account.changeState) return ["pause_vacancy", "close_vacancy"];
  return [];
}
export function canSeeVacancy(account: Account, vacancy: Vacancy, applications: ApplicationView[]): boolean {
  if (account.role === "Administrador de plataforma") return account.scope === "Plataforma completa";
  if (account.role === "Reclutador") return assignedVacancy(account, vacancy);
  if (account.role === "Representante de empresa") return vacancy.companyId === account.scope;
  if (account.role === "Revisor humano") return applications.some((a) => a.vacancyId === vacancy.id);
  return ["Candidato", "Orientador de empleabilidad"].includes(account.role) && vacancy.state === "Activa";
}
export function buildWorkspace(dataset: Dataset, accountId: string, version: number, requests: RequestView[] = [], today = chileToday()): WorkspaceView {
  const account = dataset.accounts.find((a) => a.id === accountId);
  if (!account) throw new SkillPathError("UNKNOWN_ACCOUNT", "Selecciona una cuenta ficticia válida.", 400);
  const analyses = new Map(dataset.applications.map((a) => [a.id, analyzeApplication(a, dataset, today)]));
  const ownApplications = dataset.applications.filter((a) => canSeeApplication(account, a, dataset));
  const applications = ownApplications.map((a): ApplicationView => {
    const analysis = analyses.get(a.id)!;
    const vacancy = dataset.vacancies.find((v) => v.id === a.vacancyId);
    const candidate = account.role === "Candidato";
    const events: EventView[] = candidate ? [] : analysis.chronologicalEvents.map((e) => ({ id: e.id, applicationId: e.applicationId, type: e.type, actorType: e.actorType, actorId: account.role === "Representante de empresa" && e.actorType === "Candidato" ? null : e.actorId, at: e.at, previousState: e.previousState, newState: e.newState, origin: e.origin, communicated: e.communicated, requiresReview: e.requiresReview, note: e.note ?? null, addedInDemo: !!e.addedInDemo }));
    return { id: a.id, candidateId: account.role === "Representante de empresa" ? null : a.candidateId, vacancyId: a.vacancyId, vacancyTitle: vacancy?.title ?? "Vacante no disponible", companyId: vacancy?.companyId ?? null, appliedAt: a.appliedAt, state: a.state, stateKind: analysis.stateKind, stateMeaning: meanings[a.state] ?? "El estado requiere validación.", updatedAt: a.updatedAt, source: a.source, nextStep: analysis.requiresReview ? "Un responsable debe revisar la información señalada. Esta alerta no implica rechazo ni cambia tu estado." : nextSteps[a.state] ?? "Solicita una aclaración a un responsable.", requirementsMet: candidate ? null : a.requirementsMet, lastActivityAt: analysis.lastActivityAt, daysSinceActivity: analysis.daysSinceActivity, communication: { at: a.communicatedAt, channel: a.channel, confirmed: analysis.communicationConfirmed, explanation: analysis.communicationConfirmed ? "Fecha y canal de comunicación registrados; no se realiza ningún envío desde esta demo." : "Información no disponible o incompleta: no permite afirmar que nunca hubo contacto." }, stale: analysis.stale, discrepancy: analysis.discrepancy, requiresReview: analysis.requiresReview, reviewAttended: !!a.reviewAttended, signals: candidate ? analysis.signals.filter((s) => !["requirements_review", "missing_requirements", "missing_actor"].includes(s.code)) : analysis.signals, events, requests: requests.filter((r) => r.applicationId === a.id && (!candidate || r.actorId === account.actorId)), allowedActions: applicationActions(account, a, dataset, analysis), availableTransitions: account.role === "Reclutador" && account.changeState ? transitions[a.state] ?? [] : [] };
  });
  const vacancies: VacancyView[] = dataset.vacancies.filter((v) => canSeeVacancy(account, v, applications)).map((v) => {
    const expired = v.state === "Activa" && validDate(v.closesAt) && v.closesAt < today;
    const signals: Signal[] = [];
    if (expired) signals.push(sig("expired_vacancy", "inferred", "Vacante activa con cierre vencido", `La fecha ${v.closesAt} ya pasó. No se cierra automáticamente ni se confirma disponibilidad.`));
    if (!v.closesAt) signals.push(sig("missing_close", "missing", "Cierre no disponible", "La falta de fecha no confirma que la vacante siga vigente."));
    if (!v.recruiterId && account.role !== "Candidato") signals.push(sig("missing_recruiter", "missing", "Responsable no disponible", "Falta asignar o confirmar al responsable del proceso."));
    if (!v.requirements.length) signals.push(sig("missing_vacancy_requirements", "missing", "Requisitos no disponibles", "No se interpreta el vacío como ausencia de requisitos."));
    if (!v.salary) signals.push(sig("missing_salary", "missing", "Renta no disponible", "No se conoce un rango publicado."));
    const age = daysSince(v.updatedAt, today); if (age !== null && age > STALE_DAYS) signals.push(sig("stale_vacancy", "stale", "Vacante desactualizada", `${age} días desde la actualización registrada.`));
    return { ...v, recruiterId: account.role === "Candidato" ? null : v.recruiterId, updatedAt: account.role === "Candidato" ? null : v.updatedAt, expired, signals, allowedActions: vacancyActions(account, v) };
  });
  const visibleApplicationIds = new Set(applications.map((a) => a.id)); const visibleVacancyIds = new Set(vacancies.map((v) => v.id));
  const visibleRequests = requests.filter((r) => (r.applicationId && visibleApplicationIds.has(r.applicationId) || r.vacancyId && visibleVacancyIds.has(r.vacancyId)) && (account.role !== "Candidato" || r.actorId === account.actorId)).map((r) => account.role === "Representante de empresa" && r.actorId.startsWith("CAN-") ? { ...r, actorId: "Candidato" } : r);
  if (account.role === "Representante de empresa") for (const application of applications) application.requests = application.requests.map((r) => r.actorId.startsWith("CAN-") ? { ...r, actorId: "Candidato" } : r);
  const metric = (id: string, label: string, value: number, explanation: string): Metric => ({ id, label, value, explanation });
  const metrics: Metric[] = account.metrics ? [
    ...["Activa", "Pausada", "Cerrada"].map((s) => metric(`vacancies_${s}`, `Vacantes ${s.toLowerCase()}s`, vacancies.filter((v) => v.state === s).length, "Sólo vacantes visibles para esta cuenta; estado registrado.")),
    metric("expired_vacancies", "Activas con cierre vencido", vacancies.filter((v) => v.expired).length, `Fecha de cierre anterior al ${today}; no se altera el estado.`),
    metric("stale_applications", "Sin actividad reciente", applications.filter((a) => a.stale).length, `Más de ${STALE_DAYS} días desde actualización o actividad; recordatorios no reinician el plazo.`),
    metric("missing_communication", "Comunicación por confirmar", applications.filter((a) => !a.communication.confirmed).length, "Fecha o canal insuficientes; no significa que nunca hubo contacto."),
    metric("review_queue", "Revisión humana pendiente", applications.filter((a) => a.requiresReview).length, "Marcas originales, derivaciones y anomalías pendientes dentro del alcance."),
    metric("state_discrepancies", "Discrepancias de estado", applications.filter((a) => a.discrepancy).length, "Estado registrado distinto del último evento ordenado; no se reemplaza."),
    ...APPLICATION_STATES.map((state) => metric(`stage_${state}`, `Etapa: ${state}`, applications.filter((a) => a.state === state).length, "Estado registrado de las postulaciones visibles.")),
  ] : [];
  const integrity: Signal[] = [];
  if (account.role === "Administrador de plataforma") {
    const orphanEvents = dataset.events.filter((e) => !dataset.applications.some((a) => a.id === e.applicationId)).length;
    if (orphanEvents) integrity.push(sig("orphan_events", "missing", `${orphanEvents} eventos sin postulación`, "Relaciones inválidas conservadas para revisión; no se corrigen silenciosamente."));
    const missingActors = dataset.events.filter((e) => !e.actorId).length;
    if (missingActors) integrity.push(sig("incomplete_actors", "missing", `${missingActors} eventos sin actor`, "Los campos originales permanecen sin completar; deben revisarse con evidencia."));
  }
  const accountView: AccountView = { id: account.id, name: account.name, role: account.role, actorId: account.actorId, scope: account.scope, permissions: { changeState: account.role === "Reclutador" && account.changeState, correctInformation: account.correctInformation, metrics: account.metrics, automate: account.automate, humanReview: account.role === "Revisor humano" && account.humanReview } };
  return { account: accountView, version, asOf: today, staleAfterDays: STALE_DAYS, vacancies, applications, metrics, requests: visibleRequests, integrity, source: { label: "Archivos sintéticos · Prueba 2 · Talent Tech Hack 2026", synthetic: true, counts: account.role === "Administrador de plataforma" ? { vacancies: dataset.vacancies.length, applications: dataset.applications.length, events: dataset.events.filter((e) => !e.addedInDemo).length, accounts: dataset.accounts.length } : null } };
}
export class SkillPathError extends Error { constructor(public code: string, message: string, public status = 400) { super(message); this.name = "SkillPathError"; } }
