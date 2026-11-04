import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ApplicationState, Role } from "./types";

export type CsvRow = Record<string, string>;
export interface Account { id: string; name: string; role: Role; actorId: string; scope: string; vacancyScope: string; applicationScope: string; changeState: boolean; correctInformation: boolean; metrics: boolean; automate: boolean; humanReview: boolean }
export interface Vacancy { id: string; companyId: string; recruiterId: string | null; title: string; family: string; requirements: string[]; modality: string; region: string; salary: string | null; publishedAt: string; closesAt: string | null; state: string; updatedAt: string | null }
export interface Application { id: string; candidateId: string; vacancyId: string; appliedAt: string; state: ApplicationState; updatedAt: string | null; requirementsMet: string | null; source: string | null; requiresReview: boolean; communicatedAt: string | null; channel: string | null; reviewAttended?: boolean }
export interface ProcessEvent { id: string; applicationId: string; type: string; actorType: string; actorId: string | null; at: string; previousState: string | null; newState: string; origin: string; communicated: boolean | null; requiresReview: boolean; updatedAt: string | null; note?: string; addedInDemo?: boolean; affectsState?: boolean }
export interface Dataset { accounts: Account[]; vacancies: Vacancy[]; applications: Application[]; events: ProcessEvent[] }

/** RFC4180 quoted fields, UTF-8 BOM and CRLF. Blank values remain blank until nullable mapping. */
export function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') { if (quoted && source[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted; }
    else if (char === "," && !quoted) { row.push(value); value = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) { if (char === "\r" && source[i + 1] === "\n") i++; row.push(value); if (row.some(Boolean)) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("CSV con comillas sin cerrar");
  if (value || row.length) { row.push(value); rows.push(row); }
  const header = rows.shift(); if (!header || new Set(header).size !== header.length) throw new Error("Cabecera CSV inválida");
  return rows.map((cells) => { if (cells.length !== header.length) throw new Error("Fila CSV con columnas incompletas"); return Object.fromEntries(header.map((name, index) => [name, cells[index]])); });
}
const nullable = (value: string | undefined) => value?.trim() || null;
function requireColumns(rows: CsvRow[], columns: string[]) { if (!rows.length || columns.some((column) => !(column in rows[0]))) throw new Error("CSV con esquema inesperado"); }
export function parseDataset(files: Record<"accounts" | "vacancies" | "applications" | "events", string>): Dataset {
  const a = parseCsv(files.accounts), v = parseCsv(files.vacancies), p = parseCsv(files.applications), e = parseCsv(files.events);
  requireColumns(a, ["usuario_id", "rol", "actor_id_asociado", "empresa_o_cartera_asignada", "vacantes_visibles", "postulaciones_visibles", "puede_cambiar_estados", "puede_corregir_informacion", "puede_consultar_metricas", "puede_activar_automatizaciones", "puede_realizar_revision_humana"]);
  requireColumns(v, ["vacante_id", "empresa_id", "reclutador_id", "estado_vacante", "nombre_cargo", "fecha_publicacion", "fecha_cierre", "ultima_actualizacion"]);
  requireColumns(p, ["postulacion_id", "candidato_id", "vacante_id", "estado_registrado", "fecha_postulacion", "fecha_actualizacion", "requiere_revision_humana", "fuente_estado", "fecha_ultima_comunicacion", "canal_comunicacion"]);
  requireColumns(e, ["evento_id", "postulacion_id", "tipo_evento", "actor_tipo", "actor_id", "fecha_evento", "estado_anterior", "estado_nuevo", "origen_evento", "comunicado_candidato", "requiere_revision"]);
  const dataset: Dataset = {
    accounts: a.map((r) => ({ id: r.usuario_id, name: r.nombre_ficticio, role: r.rol as Role, actorId: r.actor_id_asociado, scope: r.empresa_o_cartera_asignada, vacancyScope: r.vacantes_visibles, applicationScope: r.postulaciones_visibles, changeState: r.puede_cambiar_estados === "Sí", correctInformation: r.puede_corregir_informacion === "Sí", metrics: r.puede_consultar_metricas === "Sí", automate: r.puede_activar_automatizaciones === "Sí", humanReview: r.puede_realizar_revision_humana === "Sí" })),
    vacancies: v.map((r) => ({ id: r.vacante_id, companyId: r.empresa_id, recruiterId: nullable(r.reclutador_id), title: r.nombre_cargo, family: r.familia_cargo, requirements: r.requisitos_esenciales ? r.requisitos_esenciales.split("|") : [], modality: r.modalidad, region: r.region, salary: nullable(r.rango_renta), publishedAt: r.fecha_publicacion, closesAt: nullable(r.fecha_cierre), state: r.estado_vacante, updatedAt: nullable(r.ultima_actualizacion) })),
    applications: p.map((r) => ({ id: r.postulacion_id, candidateId: r.candidato_id, vacancyId: r.vacante_id, appliedAt: r.fecha_postulacion, state: r.estado_registrado as ApplicationState, updatedAt: nullable(r.fecha_actualizacion), requirementsMet: nullable(r.requisitos_cumplidos), source: nullable(r.fuente_estado), requiresReview: r.requiere_revision_humana === "Sí", communicatedAt: nullable(r.fecha_ultima_comunicacion), channel: nullable(r.canal_comunicacion) })),
    events: e.map((r) => ({ id: r.evento_id, applicationId: r.postulacion_id, type: r.tipo_evento, actorType: r.actor_tipo, actorId: nullable(r.actor_id), at: r.fecha_evento, previousState: nullable(r.estado_anterior), newState: r.estado_nuevo, origin: r.origen_evento, communicated: r.comunicado_candidato === "Sí" ? true : r.comunicado_candidato === "No" ? false : null, requiresReview: r.requiere_revision === "Sí", updatedAt: nullable(r.ultima_actualizacion) })),
  };
  for (const records of Object.values(dataset)) if (new Set(records.map((r: { id: string }) => r.id)).size !== records.length) throw new Error("Identificadores duplicados: se requiere revisión del archivo fuente");
  return dataset;
}
export async function loadDataset(): Promise<Dataset> {
  // Literal asset paths let Next trace only the four permitted source files.
  // Derived test fixtures use parseDataset directly, without a runtime directory override.
  const [accounts, vacancies, applications, events] = await Promise.all([
    readFile(path.join(process.cwd(), "data/skill-path/source/usuarios_roles.csv"), "utf8"),
    readFile(path.join(process.cwd(), "data/skill-path/source/vacantes.csv"), "utf8"),
    readFile(path.join(process.cwd(), "data/skill-path/source/postulaciones.csv"), "utf8"),
    readFile(path.join(process.cwd(), "data/skill-path/source/eventos_proceso.csv"), "utf8"),
  ]);
  return parseDataset({ accounts, vacancies, applications, events });
}
