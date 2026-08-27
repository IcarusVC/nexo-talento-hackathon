/**
 * Single source of truth for every enum/vocabulary value used across the app.
 * The HITL team edits Firestore by hand from the console, so these values
 * must match exactly what they type into `listings` and `applications` docs.
 * Keep this file in sync with README.md "Enum reference".
 */

export const REGIONES = [
  "Arica y Parinacota",
  "Tarapacá",
  "Antofagasta",
  "Atacama",
  "Coquimbo",
  "Valparaíso",
  "Metropolitana",
  "Libertador General Bernardo O'Higgins",
  "Maule",
  "Ñuble",
  "Biobío",
  "La Araucanía",
  "Los Ríos",
  "Los Lagos",
  "Aysén",
  "Magallanes",
] as const;

export type Region = (typeof REGIONES)[number];

export const CATEGORIAS = [
  "Administración y Oficina",
  "Atención al Cliente",
  "Comercial y Ventas",
  "Construcción",
  "Contabilidad y Finanzas",
  "Educación",
  "Gastronomía y Turismo",
  "Gerencia y Dirección",
  "Logística y Bodega",
  "Marketing y Comunicaciones",
  "Minería",
  "Operarios y Producción",
  "Recursos Humanos",
  "Salud",
  "Tecnología e Informática",
  "Transporte",
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const CONTRACT_TYPES = [
  "Contrato indefinido",
  "Contrato a plazo fijo",
  "Honorarios",
  "Por obra o faena",
] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const JOURNADAS = [
  "Jornada Completa",
  "Part Time",
  "Teletrabajo",
  "Jornada Mixta",
] as const;

export type Journada = (typeof JOURNADAS)[number];

/** `cv.status` — driven by client uploads/approval and the team's console edits. */
export const CV_STATUSES = {
  PENDIENTE_MEJORA: "pendiente_mejora",
  MEJORADO_POR_REVISAR: "mejorado_por_revisar",
  APROBADO: "aprobado",
  CAMBIOS_SOLICITADOS: "cambios_solicitados",
} as const;

export type CvStatus = (typeof CV_STATUSES)[keyof typeof CV_STATUSES];

export const CV_STATUS_LABELS: Record<CvStatus, string> = {
  pendiente_mejora: "Pendiente de mejora por el equipo",
  mejorado_por_revisar: "Mejorado, pendiente de tu revisión",
  aprobado: "Aprobado",
  cambios_solicitados: "Cambios solicitados al equipo",
};

/**
 * `applications.status` — all writes go through server routes / the team's
 * Admin SDK tooling (see lib/wallet.ts transitionApplication for the allowed
 * graph and the token movements each transition triggers). "no_aplicable" =
 * the team couldn't submit it (ClaveÚnica, captcha, expired posting…) and the
 * reserved token was returned.
 */
export const APPLICATION_STATUSES = {
  PENDIENTE: "pendiente",
  ENVIADA: "enviada",
  EN_ENTREVISTA: "en_entrevista",
  RECHAZADA: "rechazada",
  OFERTA: "oferta",
  RETIRADA: "retirada",
  NO_APLICABLE: "no_aplicable",
} as const;

export type ApplicationStatus =
  (typeof APPLICATION_STATUSES)[keyof typeof APPLICATION_STATUSES];

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pendiente: "Pendiente de envío",
  enviada: "Enviada",
  en_entrevista: "En entrevista",
  rechazada: "Rechazada",
  oferta: "Oferta recibida",
  retirada: "Retirada",
  no_aplicable: "No aplicable (token devuelto)",
};

/**
 * Token economy — one token = one job application. Tokens replace the old monthly
 * subscription. A user buys a pack (priced in CLP) via Flow; the webhook credits
 * `users/{uid}.wallet.balance`. New users get a small trial grant on signup.
 */
export const TOKEN_PACK = { tokens: 100, priceClp: 10000 } as const;

/** Tokens granted once, on account creation, so new users can try the apply flow. */
export const SIGNUP_TRIAL_TOKENS = 5;

/** `tokenLedger` entry kinds (audit trail of every wallet movement). */
export const LEDGER_TYPES = {
  TRIAL: "trial",
  PURCHASE: "purchase",
  RESERVE: "reserve",
  SETTLE: "settle",
  RELEASE: "release",
  REFUND: "refund",
} as const;

export type LedgerType = (typeof LEDGER_TYPES)[keyof typeof LEDGER_TYPES];
