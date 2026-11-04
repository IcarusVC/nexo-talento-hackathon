/** Public DTO contract. No raw CSV objects are sent to the browser. */
export const APPLICATION_STATES = ["Recibida", "En revisión", "Preseleccionada", "Entrevista", "Oferta", "Descartada", "Contratada"] as const;
export type ApplicationState = typeof APPLICATION_STATES[number];
export type Role = "Candidato" | "Reclutador" | "Representante de empresa" | "Administrador de plataforma" | "Orientador de empleabilidad" | "Revisor humano";
export type EvidenceKind = "confirmed" | "inferred" | "stale" | "missing";
export interface AccountSummary { id: string; name: string; role: Role }
export interface AccountView extends AccountSummary {
  actorId: string; scope: string;
  permissions: { changeState: boolean; correctInformation: boolean; metrics: boolean; automate: boolean; humanReview: boolean };
}
export interface Signal { code: string; kind: EvidenceKind; title: string; detail: string }
export interface VacancyView {
  id: string; companyId: string; recruiterId: string | null; title: string; family: string;
  requirements: string[]; modality: string; region: string; salary: string | null;
  publishedAt: string; closesAt: string | null; state: string; updatedAt: string | null;
  expired: boolean; signals: Signal[]; allowedActions: ActionType[];
}
export interface EventView {
  id: string; applicationId: string; type: string; actorType: string; actorId: string | null;
  at: string; previousState: string | null; newState: string | null; origin: string | null;
  communicated: boolean | null; requiresReview: boolean; note: string | null; addedInDemo: boolean;
}
export interface RequestView {
  id: string; applicationId: string | null; vacancyId: string | null; type: string;
  at: string; actorId: string; note: string; status: "pending" | "attended";
}
export interface ApplicationView {
  id: string; candidateId: string | null; vacancyId: string; vacancyTitle: string; companyId: string | null;
  appliedAt: string; state: string; stateKind: "confirmed" | "missing"; stateMeaning: string;
  updatedAt: string | null; source: string | null; nextStep: string;
  requirementsMet: string | null; lastActivityAt: string | null; daysSinceActivity: number | null;
  communication: { at: string | null; channel: string | null; confirmed: boolean; explanation: string };
  stale: boolean; discrepancy: boolean; requiresReview: boolean; reviewAttended: boolean;
  signals: Signal[]; events: EventView[]; requests: RequestView[];
  allowedActions: ActionType[]; availableTransitions: ApplicationState[];
}
export interface Metric { id: string; label: string; value: number; explanation: string }
export interface WorkspaceView {
  account: AccountView; version: number; asOf: string; staleAfterDays: number;
  vacancies: VacancyView[]; applications: ApplicationView[]; metrics: Metric[];
  requests: RequestView[]; integrity: Signal[];
  source: { label: string; synthetic: true; counts: { vacancies: number; applications: number; events: number; accounts: number } | null };
}
export const ACTION_TYPES = ["change_state", "correct_state", "request_correction", "refer_review", "resolve_review", "remind", "request_vacancy_pause", "request_vacancy_close", "pause_vacancy", "close_vacancy", "correct_information"] as const;
export type ActionType = typeof ACTION_TYPES[number];
export interface ActionInput {
  accountId: string; action: ActionType; applicationId?: string; vacancyId?: string;
  expectedVersion: number; idempotencyKey: string; note: string;
  newState?: ApplicationState; humanConfirmed?: boolean;
  resolution?: "reviewed" | "needs_information";
  field?: "requisitos_cumplidos" | "fuente_estado" | "fecha_ultima_comunicacion" | "canal_comunicacion";
  value?: string | null;
}
export interface ActionResponse { ok: true; version: number; actionId: string; message: string; replayed: boolean }
export interface ApiError { error: string; code: string }
