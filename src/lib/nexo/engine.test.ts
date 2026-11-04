import { describe, expect, it } from "vitest";
import { assessAccess, compareCurriculum, extractRequirements, getResearchOpportunities, getResearchPrograms, parseLukImport } from "./engine";
import type { Opportunity, ResearchProgram, StudentProfile } from "./types";

const row = (extra = {}) => ({ title: "Analista de datos", company: "Organización de prueba", url: "https://www.takealuk.com/job_offers/prueba-analista", description: "SQL requerido. Python deseable.", ...extra });
const opportunity = (extra: Partial<Opportunity> = {}): Opportunity => ({
  id: "test", title: "Práctica de datos", company: "Caso ilustrativo", field: "comercial", country: "Chile", location: "Santiago",
  sourceUrl: "https://example.org/practica", observedAt: "2026-11-01", provenance: "illustrative", kind: "internship", status: "observed", description: "Caso de prueba",
  skills: [], experienceMinYears: null, experienceIsRequired: null, acceptsProjects: null, acceptsGraduates: null,
  studentRequired: null, hoursPerWeek: null, scheduleText: "Jornada parcial", remuneration: "Por confirmar", supervision: "Por confirmar", limits: [], ...extra,
});
const student: StudentProfile = { hoursPerWeek: 20, yearsExperience: 0, isStudent: true, country: "Chile", demonstratedSkills: [] };

describe("extracción conservadora de requisitos", () => {
  it("distingue requerido, deseable y mencionado con evidencia", () => {
    const skills = extractRequirements("SQL requerido. Python deseable. Trabajo con Excel.").skills;
    expect(skills.find((s) => s.id === "sql")?.level).toBe("required");
    expect(skills.find((s) => s.id === "python")?.level).toBe("preferred");
    expect(skills.find((s) => s.id === "excel")?.evidence).toContain("Excel");
  });
  it("no exige habilidades negadas ni confunde IA con palabras que la contienen", () => {
    const ids = extractRequirements("No se requiere SQL. Auditoría y experiencia comercial.").skills.map((s) => s.id);
    expect(ids).not.toContain("sql"); expect(ids).not.toContain("ai");
  });
  it("separa una preferencia al final de una lista de los requisitos obligatorios", () => {
    const skills = extractRequirements("Requeridos SQL y Python avanzados, Databricks, Spark, MLflow y nube, con Azure preferido.").skills;
    for (const id of ["sql", "python", "cloud"]) expect(skills.find((s) => s.id === id)?.level).toBe("required");
    const separate = extractRequirements("SQL requerido, Python deseable.").skills;
    expect(separate.find((s) => s.id === "sql")?.level).toBe("required");
    expect(separate.find((s) => s.id === "python")?.level).toBe("preferred");
  });
  it("deja por revisar calificadores de alcance ambiguo dentro de una misma cláusula", () => {
    const skills = extractRequirements("SQL requerido y Python deseable.").skills;
    expect(skills.every((skill) => skill.level === "mentioned")).toBe(true);
  });
  it("mantiene años desconocidos cuando no se publican", () => {
    expect(extractRequirements("Sin mínimo de años publicado.").experienceMinYears).toBeNull();
    expect(extractRequirements("No se fija número previo.").experienceMinYears).toBeNull();
    expect(extractRequirements("No se requieren 3 años de experiencia.").experienceMinYears).toBeNull();
  });
  it("extrae rango de experiencia con cero sin perderlo", () => {
    expect(extractRequirements("Requisito: 0–2 años de experiencia.")).toMatchObject({ experienceMinYears: 0, experienceIsRequired: true });
  });
  it("distingue experiencia deseable de excluyente", () => {
    expect(extractRequirements("Deseable 2 años de experiencia.")).toMatchObject({ experienceMinYears: 2, experienceIsRequired: false });
    expect(extractRequirements("Mínimo 2 años de experiencia.")).toMatchObject({ experienceMinYears: 2, experienceIsRequired: true });
    expect(extractRequirements("Experiencia mínima: 2 años.").experienceMinYears).toBe(2);
    expect(extractRequirements("Experiencia: desde 1 año.").experienceMinYears).toBe(1);
  });
  it("no convierte años de carrera o duración de práctica en experiencia requerida", () => {
    expect(extractRequirements("Estudiante de 4.º año. Práctica de 12 meses.").experienceMinYears).toBeNull();
  });
  it("convierte meses sólo con contexto explícito de experiencia", () => {
    expect(extractRequirements("Se requieren 6 meses de experiencia.").experienceMinYears).toBe(0.5);
  });
  it("no transforma jornada parcial ni horas totales en horas semanales", () => {
    expect(extractRequirements("Jornada parcial. Mínimo 360 horas de práctica.").hoursPerWeek).toBeNull();
    expect(extractRequirements("Disponibilidad 40 horas semanales.").hoursPerWeek).toBe(40);
    expect(extractRequirements("44 h/semana más turnos.").hoursPerWeek).toBe(44);
  });
  it("identifica matrícula y proyectos aceptados sin convertirlos en años", () => {
    const r = extractRequirements("Matrícula vigente. Se aceptan proyectos académicos como experiencia deseable.");
    expect(r.studentRequired).toBe(true); expect(r.acceptsProjects).toBe(true); expect(r.experienceMinYears).toBeNull();
  });
});

describe("importador Luk", () => {
  it("admite arrays y conserva fecha de captura", () => {
    const r = parseLukImport(JSON.stringify([row({ captured_at: "2026-11-03T10:00:00Z" })]));
    expect(r.errors).toEqual([]); expect(r.opportunities[0].observedAt).toBe("2026-11-03T10:00:00Z");
    expect(r.opportunities[0].status).toBe("unverified");
  });
  it("admite envelope CLI data.results y descripción en detalle", () => {
    const r = parseLukImport(JSON.stringify({ schema_version: 3, data: { results: [row({ description_text: "Python requerido.", work_hours: "20 horas semanales" })] } }));
    expect(r.opportunities).toHaveLength(1); expect(r.opportunities[0].hoursPerWeek).toBe(20);
  });
  it("admite detalle individual dentro de data", () => {
    expect(parseLukImport(JSON.stringify({ data: row() })).opportunities).toHaveLength(1);
  });
  it("conserva campos reales del scraper: workday, location_text y fetched_at", () => {
    const o = parseLukImport(JSON.stringify(row({ location_text: "Santiago, Región Metropolitana, Chile", country: "CL", workday: "Jornada Parcial", fetched_at: "2026-11-03T10:00:00Z", valid_through: "2026-12-01" }))).opportunities[0];
    expect(o.country).toBe("Chile"); expect(o.location).toContain("Región Metropolitana");
    expect(o.scheduleText).toBe("Jornada Parcial"); expect(o.hoursPerWeek).toBeNull();
    expect(o.observedAt).toBe("2026-11-03T10:00:00Z"); expect(o.limits.join(" ")).toContain("2026-12-01");
  });
  it("admite JSONL y conserva errores de línea sin perder filas válidas", () => {
    const r = parseLukImport(JSON.stringify(row()) + "\ninvalid\n" + JSON.stringify(row({ url: "https://www.takealuk.com/job_offers/otra" })));
    expect(r.opportunities).toHaveLength(2); expect(r.errors[0]).toContain("Línea 2");
  });
  it("rechaza URLs ejecutables, relativas y con credenciales", () => {
    for (const url of ["javascript:alert(1)", "/job", "https://user:pass@example.com/job", "file:///private"]) {
      const r = parseLukImport(JSON.stringify(row({ url })));
      expect(r.opportunities).toHaveLength(0); expect(r.errors[0]).toContain("URL");
    }
  });
  it("deduplica URL ignorando tracking y fragmentos", () => {
    const r = parseLukImport(JSON.stringify([row(), row({ url: row().url + "?utm_source=test#apply" })]));
    expect(r.opportunities).toHaveLength(1); expect(r.warnings.some((w) => w.includes("duplicada"))).toBe(true);
  });
  it("identifica por URL aunque dos fuentes reutilicen un slug", () => {
    const r = parseLukImport(JSON.stringify([row({ slug: "shared" }), row({ slug: "shared", url: "https://another.example.org/job" })]));
    expect(new Set(r.opportunities.map((o) => o.id)).size).toBe(2);
  });
  it("no inventa fecha observada, salario ni horas", () => {
    const o = parseLukImport(JSON.stringify(row())).opportunities[0];
    expect(o.observedAt).toBe(""); expect(o.hoursPerWeek).toBeNull(); expect(o.remuneration).toBe("Remuneración no publicada");
  });
  it("etiqueta datos de prueba", () => {
    const o = parseLukImport(JSON.stringify(row({ url: "https://example.org/jobs/1", synthetic: true }))).opportunities[0];
    expect(o.provenance).toBe("illustrative");
  });
  it("respeta límite de bytes y registros", () => {
    expect(parseLukImport("x".repeat(2 * 1024 * 1024 + 1)).errors[0]).toContain("2 MB");
    expect(parseLukImport(JSON.stringify(Array.from({ length: 1001 }, () => row()))).errors[0]).toContain("1000");
  });
});

describe("comparación curricular", () => {
  const program: ResearchProgram = { id: "p", field: "comercial", institution: "Universidad de prueba", name: "Programa", version: "2026", country: "Chile", sourceUrl: "https://example.org/programa", evidence: [
    { competency: "Bases de datos", course: "Bases de datos", coverage: "explicit_required", location: "Semestre 2", sourceUrl: "https://example.org/programa" },
    { competency: "Python", course: "Python", coverage: "explicit_elective", location: "Electivo", sourceUrl: "https://example.org/programa" },
    { competency: "IA", course: "No verificable", coverage: "not_verifiable", location: "Sin programa", sourceUrl: "https://example.org/programa" },
  ] };
  it("no infiere SQL desde bases de datos", () => {
    expect(compareCurriculum(program, opportunity({ skills: extractRequirements("SQL requerido").skills }))[0].status).toBe("unverified");
  });
  it("distingue electivo y desconocido", () => {
    const matches = compareCurriculum(program, opportunity({ skills: extractRequirements("Python e IA").skills }));
    expect(matches.find((m) => m.skill.id === "python")?.status).toBe("elective");
    expect(matches.find((m) => m.skill.id === "ai")?.status).toBe("unverified");
  });
});

describe("acceso y datos de investigación", () => {
  it("cambiar 20 a 40 horas elimina barrera horaria sin prometer selección", () => {
    const o = opportunity({ hoursPerWeek: 40 });
    expect(assessAccess(o, student).status).toBe("incompatible");
    const fit = assessAccess(o, { ...student, hoursPerWeek: 40 });
    expect(fit.status).toBe("needs_review"); expect(fit.barriers).toEqual([]);
  });
  it("experiencia deseable no excluye; proyectos no reemplazan mínimo obligatorio", () => {
    expect(assessAccess(opportunity({ experienceMinYears: 2, experienceIsRequired: false }), student).barriers).toEqual([]);
    expect(assessAccess(opportunity({ experienceMinYears: 2, experienceIsRequired: true, acceptsProjects: true }), student).barriers.some((r) => r.label.includes("Experiencia"))).toBe(true);
  });
  it("matrícula y cierre son barreras distintas de habilidad", () => {
    const fit = assessAccess(opportunity({ studentRequired: true, status: "closed" }), { ...student, isStudent: false });
    expect(fit.barriers.map((b) => b.label)).toContain("Matrícula requerida");
    expect(fit.barriers.map((b) => b.label)).toContain("Convocatoria cerrada");
  });
  it("no trata cambio de país como autorización automática ni rechazo por nacionalidad", () => {
    const fit = assessAccess(opportunity({ country: "Brasil" }), student);
    expect(fit.unknown.some((r) => r.label === "Condiciones territoriales")).toBe(true);
    expect(fit.barriers).toEqual([]);
  });
  it("conserva 24 programas y deduplica 25 registros con prioridad de vías", () => {
    const programs = getResearchPrograms(); const opportunities = getResearchOpportunities();
    expect(programs).toHaveLength(24); expect(opportunities).toHaveLength(22);
    expect(opportunities.some((o) => o.id === "OP-N-PRIZE")).toBe(true);
    expect(opportunities.some((o) => o.id === "EMP-COM-PRIZE")).toBe(false);
    expect(opportunities.every((o) => o.status !== "observed")).toBe(true);
    expect(opportunities.find((o) => o.id === "OP-N-PRIZE")?.experienceMinYears).toBe(1);
    expect(opportunities.find((o) => o.id === "OP-N-PRIZE")?.acceptsGraduates).toBe(true);
  });
  it("preserva salud digital obligatoria y alcance dentro del programa", () => {
    const p = getResearchPrograms().find((p) => p.id === "MED-CL-UCH-2026")!;
    const e = p.evidence.find((e) => e.course?.includes("ME11063"));
    expect(e?.coverage).toBe("explicit_required"); expect(e?.sourceUrl).toContain("2026.2");
  });
});
