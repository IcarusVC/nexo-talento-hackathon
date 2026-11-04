import researchData from "@/data/nexo/research.json";
import opportunityData from "@/data/nexo/opportunities.json";
import type {
  CurriculumEvidence, CurriculumMatch, ExperienceRequirement, ExtractedRequirements, Field, FitAssessment,
  ImportResult, Opportunity, PublishedSalary, ResearchProgram, SkillRequirement, StudentProfile,
} from "./types";

// Deliberately deterministic and inspectable. These are text matches to review,
// not a certification of skills or a prediction of employability.
const SKILLS = [
  ["sql", "SQL", ["sql"]],
  ["python", "Python", ["python"]],
  ["excel", "Excel / planillas", ["excel", "google sheets", "planillas", "spreadsheets"]],
  ["power-bi", "Power BI", ["power bi", "powerbi"]],
  ["analytics", "Análisis de datos", ["analitica", "analytics", "analisis de datos", "data analysis", "big data", "inteligencia de negocios", "business intelligence"]],
  ["programming", "Programación", ["programacion", "programming", "programar", "coding"]],
  ["communication", "Comunicación", ["comunicacion", "communication", "comunicativa", "comunicacionales", "presentaciones", "presentations"]],
  ["collaboration", "Colaboración", ["colaboracion", "collaboration", "trabajo en equipo", "teamwork", "interprofesional", "multidisciplinario", "multidisciplinaria", "coordinacion"]],
  ["accounting", "Contabilidad", ["contabilidad", "accounting", "conciliaciones", "cierres contables"]],
  ["audit", "Auditoría", ["auditoria", "auditing", "audit", "assurance", "papeles de trabajo"]],
  ["erp", "ERP", ["erp"]],
  ["sap", "SAP", ["sap", "s/4hana"]],
  ["risk", "Riesgos y control", ["riesgo", "riesgos", "risk", "controles internos", "compliance"]],
  ["ethics", "Ética", ["etica", "ethics", "bioetica", "confidencialidad"]],
  ["statistics", "Estadística", ["estadistica", "statistics", "bioestadistica", "inferencia", "econometria"]],
  ["machine-learning", "Aprendizaje automático", ["machine learning", "aprendizaje automatico", "ml", "deep learning"]],
  ["ai", "Inteligencia artificial", ["inteligencia artificial", "artificial intelligence", "ia", "llm", "modelos de lenguaje"]],
  ["software", "Ingeniería de software", ["ingenieria de software", "software engineering", "software construction", "construccion de software", "desarrollo de software"]],
  ["databases", "Bases de datos", ["bases de datos", "base de datos", "databases", "database"]],
  ["cloud", "Nube", ["cloud", "nube", "aws", "azure"]],
  ["testing", "Pruebas de software", ["testing", "pruebas de software", "pruebas y documentacion", "verificacion de programas"]],
  ["documentation", "Documentación", ["documentacion", "documentation", "documentado"]],
  ["clinical-evidence", "Evidencia clínica", ["medicina basada en evidencia", "medicina basada en la evidencia", "evidencia clinica", "evidence based", "evaluacion de evidencia"]],
  ["digital-health", "Salud digital", ["salud digital", "medicina digital", "digital health", "telemedicina", "registro clinico digital", "documentacion electronica", "ficha electronica"]],
  ["research", "Investigación", ["investigacion", "research", "proyectos cientificos"]],
  ["security", "Seguridad", ["ciberseguridad", "cybersecurity", "seguridad computacional", "seguridad de datos", "seguridad de ia"]],
  ["data-quality", "Calidad de datos", ["calidad de datos", "data quality", "limpieza de datos", "etl"]],
  ["crm", "CRM", ["crm", "hubspot"]],
  ["english", "Inglés", ["ingles", "english"]],
  ["automation", "Automatización", ["automatizacion", "automation"]],
  ["mlops", "MLOps", ["mlops"]],
] as const;

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
type RecordValue = Record<string, unknown>;
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const str = (value: unknown) => typeof value === "string" ? value.trim() : "";
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : typeof value === "string" ? [value] : [];
const rec = (value: unknown): RecordValue | null => value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const contains = (text: string, alias: string) => new RegExp(`(^|[^a-z0-9])${escape(alias)}(?=$|[^a-z0-9])`, "i").test(text);
const safeUrl = (value: unknown): string | null => {
  try {
    const url = new URL(str(value));
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};
const urlKey = (value: string) => {
  const url = new URL(value);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
  return url.href.replace(/\/$/, "");
};

function requirementLevel(sentence: string): SkillRequirement["level"] {
  const value = fold(sentence);
  if (/deseable|preferid|preferen|preferred|preferabl|nice to have|como plus|a plus|valorad|no excluyente|no (?:es )?obligatorio/.test(value)) return "preferred";
  if (/requerid|requisito|excluyente|obligatorio|required|requirements|must have|(?:se )?(?:exige|requiere)|indispensable|minim[oa]/.test(value)) return "required";
  return "mentioned";
}

function skillRequirementLevel(sentence: string, aliases: readonly string[], inherited: SkillRequirement["level"] = "mentioned"): SkillRequirement["level"] {
  // A preference at the end of a list must not relabel its required items.
  // Carry list context across commas, but let an explicit qualifier override it.
  let context: SkillRequirement["level"] = inherited;
  const levels: SkillRequirement["level"][] = [];
  for (const clause of sentence.split(/,|\b(?:pero|but|whereas|mientras que)\b/i)) {
    const value = fold(clause);
    const explicit = requirementLevel(clause);
    const mixed = explicit === "preferred" && /requerid|obligatorio|required|must have|se exige|indispensable/.test(value.replace(/no (?:es )?obligatorio|not required/g, ""));
    if (mixed) context = "mentioned"; // Mixed scope within one clause needs human review.
    else if (explicit !== "mentioned") context = explicit;
    if (aliases.some((alias) => contains(value, alias))) levels.push(context);
  }
  return levels.includes("required") ? "required" : levels.includes("preferred") ? "preferred" : "mentioned";
}

function requirementSegments(clean: string) {
  let level: SkillRequirement["level"] = "mentioned";
  let heading = "";
  // A period inside a decimal is not a sentence boundary. Retain line structure
  // so an explicit requirements heading can qualify the following list.
  return clean.split(/[\n;!?]+|\.(?!\d)/).map((text) => text.trim()).filter(Boolean).map((text) => {
    const value = fold(text).replace(/^[\s#*•-]+/, "");
    const isHeading = /:$/.test(value) || /^(?:requisitos(?: obligatorios)?|requirements|must have|deseables|nice to have|responsabilidades|funciones|beneficios)$/.test(value);
    if (isHeading && text.length < 100 && !SKILLS.some(([, , aliases]) => aliases.some((alias) => contains(value, alias)))) {
      level = requirementLevel(text);
      heading = text;
    }
    return { text, level, evidence: heading && heading !== text ? `${heading}\n${text}` : text };
  });
}

function affirmedSkill(sentence: string, aliases: readonly string[]): boolean {
  return sentence.split(/,|\b(?:pero|but|whereas|mientras que)\b/i).some((clause) => {
    const value = fold(clause);
    const explicitlyPreferred = /deseable|preferid|preferred|nice to have|valorad/.test(value);
    const negation = "(?:no (?:se )?(?:requiere[n]?|exige[n]?)|no (?:es |son )?(?:necesari[oa]s?|obligatori[oa]s?)|not required|not necessary|is not required|isn't required)";
    return aliases.some((alias) => contains(value, alias) && (explicitlyPreferred || !(
      new RegExp(`${negation}[^,;:.]{0,45}${escape(alias)}(?=$|[^a-z0-9])`).test(value)
      || new RegExp(`${escape(alias)}[^,;:.]{0,20}${negation}`).test(value)
    )));
  });
}

function extractExperience(segments: ReturnType<typeof requirementSegments>): ExperienceRequirement[] {
  const requirements: ExperienceRequirement[] = [];
  const duration = "(\\d+(?:[,.]\\d+)?)(?:\\s*(?:-|–|—|a|to|hasta)\\s*\\d+(?:[,.]\\d+)?)?\\s*(anos?|years?|meses?|months?)";
  const hasExperienceContext = segments.some(({ text }) => /experiencia|experience/.test(fold(text)));
  for (const segment of segments) {
    const value = numberWords(fold(segment.text));
    if (/no (?:se )?(?:publica|fija|especifica|declara)|sin minimo.*publicad|sin numero|no exige numero/.test(value)) continue;
    if (/\bno\s+(?:se\s+)?(?:requieren?|exigen?|es (?:necesari[oa]|obligatori[oa]))[^.;]{0,45}(?:anos?|years?|meses?)/.test(value)) continue;
    if (/sin experiencia(?: previa| laboral)?(?: requerida)?\b|no experience (?:required|needed)|no (?:se )?(?:requiere|exige) experiencia/.test(value)) {
      requirements.push({ minYears: 0, strictMinimum: false, isRequired: false, scope: null, evidence: segment.evidence });
      continue;
    }
    const after = new RegExp(`${duration}\\s*(?:de\\s+|of\\s+)?(?:experiencia|experience|programacion formal|desarrollo requerido)`, "g");
    const before = new RegExp(`(?:experiencia|experience)\\s*:?\\s*(?:(?:minima?|minimo|requerid[ao]|laboral|previa|minimum|required|professional|al menos|at least|de|of|desde)\\s*:?\\s*)*${duration}`, "g");
    const matches = [...value.matchAll(after), ...value.matchAll(before)];
    // Some postings continue an explicit experience requirement with domains
    // (e.g. "además exige 3 años en ML y 2 años operando cloud").
    if (hasExperienceContext && !/carrera|estudiante|universidad|duracion|practica de/.test(value)
      && (segment.level === "required" || /exige|requiere|al menos|at least/.test(value))) {
      matches.push(...value.matchAll(new RegExp(`${duration}(?=\\s+(?:en|con|operando|trabajando|in|with)\\b)`, "g")));
    }
    const seen = new Set<number>();
    for (const match of matches.sort((a, b) => a.index! - b.index!)) {
      const numberIndex = match.index! + match[0].indexOf(match[1]);
      if (seen.has(numberIndex)) continue;
      seen.add(numberIndex);
      const amount = Number(match[1].replace(",", "."));
      if (!Number.isFinite(amount) || amount > 80) continue;
      const prefix = value.slice(0, numberIndex).split(/,|\b(?:pero|but)\b/).at(-1) ?? "";
      const tail = value.slice(match.index! + match[0].length).split(/\s+y\s+\d|\s+and\s+\d|,/)[0].trim();
      const qualifier = `${prefix} ${tail}`;
      if (/not required|not necessary|no (?:es |son )?(?:necesari[oa]s?|obligatori[oa]s?)/.test(qualifier)
        && !/deseable|preferid|preferred|nice to have/.test(qualifier)) continue;
      const explicitLevel = requirementLevel(qualifier);
      const level = explicitLevel === "mentioned" ? segment.level : explicitLevel;
      const isRequired = level === "preferred" ? false : level === "required" || /minimo|al menos|desde|at least|mas de/.test(prefix) ? true : null;
      requirements.push({ minYears: /mes|month/.test(match[2]) ? amount / 12 : amount,
        strictMinimum: /(?:mas de|more than|over)\s*$/.test(prefix), isRequired,
        scope: /^(?:en|con|como|de|operando|trabajando|in|with)\b/.test(tail) ? tail.slice(0, 250) : null,
        evidence: segment.evidence.slice(0, 500) });
    }
  }
  return requirements;
}

function numberWords(value: string) {
  return value.replace(/\b(un|uno|una|one|dos|two|tres|three|cuatro|four|cinco|five)\b/g,
    (word) => ({ un: "1", uno: "1", una: "1", one: "1", dos: "2", two: "2", tres: "3", three: "3", cuatro: "4", four: "4", cinco: "5", five: "5" })[word] ?? word);
}

/** Every numeric extraction needs its unit and explicit context. Unknown stays null. */
export function extractRequirements(text: string): ExtractedRequirements {
  const clean = text.replace(/<\/?(?:p|li|ul|ol|h[1-6]|br)\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, " ").replace(/\r/g, "");
  const segments = requirementSegments(clean);
  const skills: SkillRequirement[] = [];
  for (const [id, label, aliases] of SKILLS) {
    const matches = segments.filter((segment) => affirmedSkill(segment.text, aliases));
    if (matches.length) {
      const rank = { required: 2, preferred: 1, mentioned: 0 };
      const segment = matches.sort((a, b) => rank[skillRequirementLevel(b.text, aliases, b.level)] - rank[skillRequirementLevel(a.text, aliases, a.level)])[0];
      skills.push({ id, label, evidence: segment.evidence.slice(0, 500), level: skillRequirementLevel(segment.text, aliases, segment.level) });
    }
  }

  const experienceRequirements = extractExperience(segments);
  // Preserve legacy fields for consumers, but never let an earlier preference
  // hide a mandatory threshold. Domain durations overlap: they are not summed.
  const priority = (r: ExperienceRequirement) => r.isRequired === true ? 3 : r.isRequired === null ? 2 : r.minYears === 0 ? 1 : 0;
  const primary = [...experienceRequirements].sort((a, b) => priority(b) - priority(a) || b.minYears - a.minYears || Number(b.strictMinimum) - Number(a.strictMinimum))[0];
  const experienceMinYears = primary?.minYears ?? null;
  const experienceIsRequired = primary?.isRequired ?? null;
  const experienceStrictMinimum = primary?.strictMinimum ?? false;
  const normalized = fold(clean);
  const hours = normalized.match(/\b(\d{1,2})(?:[,.]0)?\s*(?:horas?|hrs?|h)\s*(?:por\s+semana|a la semana|semanales|\/\s*(?:semana|week)|per week|weekly)\b/)
    ?? normalized.match(/\b(\d{1,2})\s+semanales\b/);
  const hoursPerWeek = hours && Number(hours[1]) > 0 && Number(hours[1]) <= 80 ? Number(hours[1]) : null;
  const projectsMention = /(?:acepta|admite|considera|valora|accept|consider)[^.\n;]{0,90}(?:proyectos? academic|academic project)|(?:proyectos? academic|academic project)[^.\n;]{0,90}(?:acepta|admite|como experiencia|accepted|considered)/.test(normalized);
  const projectsRejected = /no (?:se )?(?:acepta|admite|considera)[^.\n;]{0,50}proyectos? academic/.test(normalized);
  const graduatesAccepted = /(?:admite|acepta|considera|abiert[oa] a)[^.\n;]{0,65}recien (?:titulad|egresad)|(?:recien graduad|recent graduates)[^.\n;]{0,45}(?:welcome|accepted)/.test(normalized);
  const studentCondition = /(?:requisito[^.\n;]{0,50})?(?:matricula (?:vigente|universitaria)|estudiante (?:regular|universitario)|students? enrolled|currently enrolled)|debe ser estudiante|estudiantes (?:fen|de medicina)|alumnado de (?:la carrera|medicina)/.test(normalized);
  return { skills, experienceMinYears, experienceIsRequired, experienceStrictMinimum, experienceRequirements,
    acceptsProjects: projectsRejected ? false : projectsMention ? true : null,
    acceptsGraduates: graduatesAccepted ? true : null,
    studentRequired: /no (?:se )?(?:requiere|exige) matricula/.test(normalized) ? false : studentCondition ? true : null,
    hoursPerWeek };
}

function field(value: unknown): Field | "general" {
  const f = str(value);
  return ["comercial", "contabilidad", "medicina", "computacion"].includes(f) ? f as Field : "general";
}

export function getResearchPrograms(): ResearchProgram[] {
  return researchData.programs.map((entry) => {
    const p = entry as unknown as RecordValue;
    const sourceUrl = str(p.url);
    return { id: str(p.id), field: field(p.field) as Field, institution: str(p.institution), country: str(p.country),
      name: str(p.program), version: str(p.version), sourceUrl,
      evidence: (Array.isArray(p.verified_evidence) ? p.verified_evidence : []).map((item: unknown) => {
        const e = rec(item) ?? {};
        return { competency: str(e.competency), course: str(e.course) || null, coverage: str(e.coverage),
          location: [str(e.location), str(e.scope)].filter(Boolean).join(" · "), sourceUrl: safeUrl(e.source_url) ?? sourceUrl };
      }) };
  });
}

function detectCountry(value: string): string {
  const text = fold(value);
  const code = ({ cl: "Chile", br: "Brasil", co: "Colombia", mx: "México", pe: "Perú", us: "Estados Unidos", usa: "Estados Unidos", cn: "China" } as Record<string, string>)[text.trim()];
  if (code) return code;
  if (contains(text, "chile") && /mexico|brasil|colombia|peru/.test(text)) return value;
  if (/brasil|brazil|sao paulo|belo horizonte/.test(text)) return "Brasil";
  if (/mexico/.test(text)) return "México";
  if (/colombia/.test(text)) return "Colombia";
  if (/estados unidos|united states/.test(text)) return "Estados Unidos";
  if (/chile|santiago|tarapaca/.test(text)) return "Chile";
  return "Por confirmar";
}

function kind(value: string, title: string): Opportunity["kind"] {
  const text = fold(value);
  if (/curricular/.test(text)) return "curricular";
  if (/public_program|university_route|professional_public|program/.test(text)) return "program";
  if (/intern|practica|pasantia/.test(text + " " + fold(title))) return "internship";
  if (/entry|junior|nivel 1/.test(text + " " + fold(title))) return "entry_job";
  return "job";
}

function researchStatus(value: string, type: Opportunity["kind"]): Opportunity["status"] {
  if (/historical_closed|live_job_removed|closed_confirmed/.test(value)) return "closed";
  if (["program", "curricular"].includes(type) || /not_specific_vacancy/.test(value)) return "program";
  // A historical observation is never promoted to a live vacancy.
  return "unverified";
}

function yearText(value: unknown): string {
  const input = str(value);
  return /^\d+(?:\s*[–—-]\s*\d+)?\.?$/.test(input) ? `Experiencia: ${input.replace(/\.$/, "")} años` : input;
}

function researchOpportunity(p: RecordValue, employers: RecordValue[]): Opportunity {
  const linked = employers.find((e) => safeUrl(e.url) && urlKey(str(e.url)) === urlKey(str(p.url)));
  const title = str(p.title) || str(p.role);
  const type = kind(str(p.kind), title);
  const rawExperience = yearText(p.experience_years) || str(p.seniority);
  const description = [str(p.eligibility), rawExperience ? `Experiencia: ${rawExperience}` : "", str(p.schedule), str(p.supervision),
    ...strings(p.declared_work_products), ...strings(p.learning), ...strings(p.skills), ...strings(linked?.skills)].filter(Boolean).join(".\n");
  const requirements = extractRequirements(description);
  // Research prose sometimes gives ranges without repeating 'experience'.
  const isolated = rawExperience.match(/\b(\d+)\s*[–—-]\s*\d+\s*años\b/i);
  if (requirements.experienceMinYears === null && isolated) requirements.experienceMinYears = Number(isolated[1]);
  const location = str(p.location);
  return { id: str(p.id), title, company: str(p.organization) || str(p.company),
    field: field(linked?.field ?? p.field), country: str(p.country) || detectCountry(location), location,
    sourceUrl: str(p.url), observedAt: str(p.observed_date) || researchData.cutoff, provenance: "research",
    kind: type, status: researchStatus(str(p.status), type), description, ...requirements,
    scheduleText: str(p.schedule) || "Jornada no publicada en la evidencia revisada",
    remuneration: str(p.remuneration) || "Remuneración no verificada", supervision: str(p.supervision) || "Supervisión no verificada",
    limits: [...strings(p.limits), ...strings(linked?.limits), "Observación documental; confirmar vigencia y requisitos antes de postular."] };
}

export function getResearchOpportunities(): Opportunity[] {
  const employers = researchData.employers as unknown as RecordValue[];
  const result: Opportunity[] = [];
  const seen = new Set<string>();
  for (const value of [...opportunityData.opportunities, ...employers]) {
    const p = value as unknown as RecordValue;
    const source = safeUrl(p.url);
    if (!source || seen.has(urlKey(source))) continue;
    seen.add(urlKey(source));
    result.push(researchOpportunity(p, employers));
  }
  return result;
}

/** Candidate links only: tools are not inferred from broad course names. */
export function compareCurriculum(program: ResearchProgram, opportunity: Opportunity): CurriculumMatch[] {
  return opportunity.skills.map((skill) => {
    const definition = SKILLS.find(([id]) => id === skill.id);
    const aliases = definition?.[2] ?? [fold(skill.label)];
    const relevant = program.evidence.filter((e) => e.coverage !== "not_verifiable" &&
      aliases.some((alias) => contains(fold(`${e.competency} ${e.course ?? ""}`), alias)));
    const declared = relevant.filter((e) => ["explicit_required", "mentioned"].includes(e.coverage));
    if (declared.length) return { skill, status: "declared", evidence: declared,
      note: "Coincidencia textual con formación declarada. Revisar contenido y evaluación; no demuestra dominio del estudiante." };
    if (relevant.length) return { skill, status: "elective", evidence: relevant,
      note: "Contenido electivo o dentro de un bloque de elección. Confirmar itinerario y cohorte; no atribuirlo a todos los egresados." };
    return { skill, status: "unverified", evidence: [],
      note: "La documentación examinada no permite verificar esta capacidad. Esto no prueba ausencia de enseñanza." };
  });
}

const equivalentCountry = (a: string, b: string) => fold(a).trim() === fold(b).trim();

export function assessAccess(opportunity: Opportunity, profile: StudentProfile): FitAssessment {
  const result: FitAssessment = { status: "needs_review", matched: [], unknown: [], barriers: [] };
  if (opportunity.status === "closed") result.barriers.push({ label: "Convocatoria cerrada", detail: "Este registro es histórico; no es una opción de postulación actual." });
  else if (opportunity.status === "program") result.unknown.push({ label: "Vía institucional", detail: "Un programa o internado no garantiza un cupo. Confirmar convocatoria y elegibilidad." });
  else result.unknown.push({ label: "Vigencia por confirmar", detail: `La fuente fue observada ${opportunity.observedAt || "sin fecha"}; una publicación no garantiza disponibilidad actual.` });

  if (opportunity.hoursPerWeek === null) result.unknown.push({ label: "Horario no confirmado", detail: opportunity.scheduleText || "La etiqueta de jornada no indica horas semanales." });
  else if (opportunity.hoursPerWeek > profile.hoursPerWeek) result.barriers.push({ label: "Horario incompatible", detail: `La oferta indica ${opportunity.hoursPerWeek} horas semanales y declaraste ${profile.hoursPerWeek}. Es una barrera de acceso, no una falta de habilidad.` });
  else result.matched.push({ label: "Disponibilidad horaria", detail: `Las ${opportunity.hoursPerWeek} horas publicadas caben en tus ${profile.hoursPerWeek} horas disponibles. Falta acordar distribución.` });

  if (opportunity.studentRequired === true && !profile.isStudent) result.barriers.push({ label: "Matrícula requerida", detail: "La vía exige ser estudiante. Buscar una alternativa para egresados o confirmar una excepción." });
  else if (opportunity.studentRequired === true) result.matched.push({ label: "Condición de estudiante", detail: "Declaraste matrícula; deben comprobarse carrera, seguro y avance académico exigidos." });
  else if (opportunity.studentRequired === null) result.unknown.push({ label: "Elegibilidad académica", detail: "No se verificó si exige matrícula, título, habilitación u otro requisito." });

  if (opportunity.experienceMinYears === null) result.unknown.push({ label: "Experiencia por precisar", detail: "No hay un mínimo de años verificable. No equivale a aceptar cero años." });
  else if (opportunity.experienceStrictMinimum ? profile.yearsExperience > opportunity.experienceMinYears : profile.yearsExperience >= opportunity.experienceMinYears) {
    const scoped = opportunity.experienceRequirements?.filter((requirement) => requirement.scope);
    if (scoped?.length) result.unknown.push({ label: "Experiencia por ámbito pendiente", detail: `Declaraste ${profile.yearsExperience} años totales. No comprueban los períodos específicos publicados: ${scoped.map((r) => `${r.strictMinimum ? "más de " : ""}${r.minYears} años ${r.scope}${r.isRequired === false ? " (deseable)" : ""}`).join("; ")}. Los períodos pueden superponerse y no se suman.` });
    else result.matched.push({ label: "Experiencia declarada", detail: `Declaraste ${profile.yearsExperience} años frente a ${opportunity.experienceStrictMinimum ? "más de " : ""}${opportunity.experienceMinYears} publicados. Falta comprobar tipo y reconocimiento.` });
  }
  else if (opportunity.experienceIsRequired === true && opportunity.acceptsGraduates !== true) result.barriers.push({ label: "Experiencia mínima exigida", detail: `Se publican ${opportunity.experienceStrictMinimum ? "más de " : ""}${opportunity.experienceMinYears} años como requisito. Un proyecto no se convierte automáticamente en años equivalentes.` });
  else result.unknown.push({ label: "Experiencia revisable", detail: opportunity.acceptsGraduates ? "El aviso contempla recién egresados: confirmar evidencia y excepción aplicable." : "La experiencia es deseable o no está definida como excluyente. Confirmar qué evidencia acepta la empresa." });
  if (opportunity.acceptsProjects === true) result.matched.push({ label: "Proyectos considerados", detail: "La fuente contempla proyectos como antecedentes; el empleador debe reconocer su pertinencia." });

  if (!profile.country || opportunity.country === "Por confirmar") result.unknown.push({ label: "Ubicación por confirmar", detail: "No se verificó compatibilidad territorial." });
  else if (!equivalentCountry(opportunity.country, profile.country)) result.unknown.push({ label: "Condiciones territoriales", detail: `La fuente indica ${opportunity.country}; confirmar lugar, modalidad y elegibilidad desde ${profile.country}. No se presume traslado ni permiso laboral.` });
  else result.matched.push({ label: "País coincidente", detail: `${opportunity.country}; aún deben acordarse ciudad, modalidad y traslados.` });

  for (const skill of opportunity.skills) {
    if (profile.demonstratedSkills.includes(skill.id)) result.matched.push({ label: skill.label, detail: "Autodeclarada en tu perfil; pendiente de revisión. Marcarla no certifica dominio ni valida evidencia." });
    else result.unknown.push({ label: `${skill.label}: respaldo por confirmar`, detail: "No has declarado esta habilidad en el perfil. Si compartiste evidencia, falta revisar su pertinencia y nivel; este estado no indica falta de capacidad." });
  }
  result.unknown.push({ label: "Condiciones y evaluación", detail: "Confirmar remuneración, tutoría, requisitos profesionales y evidencia aceptada antes de decidir." });
  result.status = result.barriers.length ? "incompatible" : result.unknown.length ? "needs_review" : "compatible";
  return result;
}

function dateValue(value: unknown): string {
  const text = str(value);
  return /^\d{4}-\d{2}-\d{2}(?:T[^\s]+)?$/.test(text) && Number.isFinite(Date.parse(text)) ? text : "";
}

function publishedSalary(value: unknown): PublishedSalary | undefined {
  const salary = rec(value);
  if (!salary) return undefined;
  const min = salary.min ?? salary.min_amount;
  const max = salary.max ?? salary.max_amount ?? min;
  const currency = str(salary.currency).toUpperCase();
  const periods: Record<string, PublishedSalary["period"]> = { month: "month", monthly: "month", mes: "month", mensual: "month", year: "year", yearly: "year", annual: "year", anual: "year", hour: "hour", hourly: "hour", hora: "hour" };
  const period = periods[fold(str(salary.period))];
  if (typeof min !== "number" || typeof max !== "number" || !Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min || !/^[A-Z]{3}$/.test(currency) || !period) return undefined;
  const basis = salary.basis === "gross" || salary.basis === "net" ? salary.basis : "unspecified";
  return { min, max, currency, period, basis, quote: str(salary.quote).slice(0, 240) };
}

function importRow(raw: RecordValue, index: number): Opportunity {
  const sourceUrl = safeUrl(raw.url ?? raw.sourceUrl);
  if (!sourceUrl) throw new Error(`Fila ${index}: falta una URL HTTP/HTTPS válida, sin credenciales.`);
  const title = str(raw.title) || str(raw.role);
  if (!title) throw new Error(`Fila ${index}: falta el título del cargo.`);
  const company = str(raw.company) || str(raw.organization) || str(rec(raw.company)?.name) || "Empresa no indicada";
  const description = [str(raw.description_text) || str(raw.description), str(raw.requirements_text), str(raw.work_hours), str(raw.schedule), str(raw.workday)].filter(Boolean).join("\n");
  const scheduleText = [raw.work_hours, raw.schedule, raw.workday, raw.jornada, raw.journada, raw.scheduleText].map(str)
    .find((value) => value && !["job", "entry_job", "internship", "program", "curricular"].includes(value)) || "Horario no publicado";
  // Serialized opportunities carry scheduleText separately. Parse its explicit
  // units without appending it to description on every import/session reload.
  const extracted = extractRequirements(description.includes(scheduleText) ? description : `${description}\n${scheduleText}`);
  const salary = rec(raw.salary);
  const normalizedSalary = publishedSalary(salary);
  const min = raw.salary_min ?? salary?.min ?? salary?.min_amount;
  const max = raw.salary_max ?? salary?.max ?? salary?.max_amount;
  const currency = str(raw.currency) || str(salary?.currency);
  const period = str(salary?.period);
  const salaryAmount = [min, max].filter((v) => typeof v === "number" && Number.isFinite(v)).join("–");
  const observedAt = dateValue(raw.captured_at ?? raw.scraped_at ?? raw.observed_at ?? raw.observedAt ?? raw.fetched_at);
  const explicitlyIllustrative = raw.provenance === "illustrative" || raw.is_demo === true || raw.synthetic === true;
  const fixtureClue = /\b(?:fixture|fictici[oa]|sintetic[oa]|synthetic|empresa demo|company demo|fake employer)\b/i.test(title + " " + company + " " + description) || /(?:example\.(?:com|org|test)|\.test)$/.test(new URL(sourceUrl).hostname);
  const illustrative = explicitlyIllustrative || fixtureClue;
  const rawStatus = fold(str(raw.status));
  const status = /^(?:closed|expired|removed|historical_closed)$/.test(rawStatus) ? "closed" : "unverified";
  const sourceKind = str(raw.employment_type) || str(raw.job_type) || str(raw.kind);
  const location = str(raw.location) || str(raw.location_text) || [str(raw.comuna), str(raw.region)].filter(Boolean).join(", ");
  const countryValue = str(raw.country) || str(rec(raw.address)?.country);
  const country = countryValue ? detectCountry(countryValue) : detectCountry(location);
  return {
    id: `luk-${hashUrl(urlKey(sourceUrl))}`,
    title, company, field: field(raw.field), country: country === "Por confirmar" && countryValue ? countryValue : country,
    location: location || "Ubicación no publicada",
    sourceUrl, observedAt, provenance: illustrative ? "illustrative" : "imported", kind: kind(sourceKind, title), status,
    description, ...extracted, ...(normalizedSalary ? { salary: normalizedSalary } : {}),
    ...(["entry", "mid", "senior", "lead", "unspecified"].includes(str(raw.seniority)) ? { seniority: str(raw.seniority) as Opportunity["seniority"] } : {}),
    scheduleText,
    remuneration: str(raw.remuneration) || (salaryAmount ? `${currency || "Moneda no indicada"} ${salaryAmount}; ${period ? `periodicidad: ${period}` : "periodicidad por confirmar"}; bruto/líquido por confirmar` : "Remuneración no publicada"),
    supervision: str(raw.supervision) || "Supervisión no publicada",
    limits: ["Extracción automática por reglas; revisar texto original y condiciones.", ...strings(raw.limits).slice(0, 15).map((s) => s.slice(0, 800)),
      ...(observedAt ? [] : ["El archivo no aporta fecha de captura verificable; no se sustituye por la fecha de importación."]),
      ...(illustrative ? ["Registro ilustrativo o de prueba: no usar como vacante real ni evidencia de mercado."] : []),
      ...(dateValue(raw.valid_through) ? [`Vencimiento publicado por la fuente: ${dateValue(raw.valid_through)}; comprobar estado actual.`] : []),
      ...(dateValue(raw.date_posted ?? raw.published_at) ? [`Publicación declarada: ${dateValue(raw.date_posted ?? raw.published_at)}.`] : []),
      ...(str(raw.modality) ? [`Modalidad publicada: ${str(raw.modality)}; confirmar condiciones específicas.`] : []),
      ...(raw.text_truncated === true ? ["La descripción de origen está truncada; pueden faltar requisitos."] : [])],
  };
}

function hashUrl(url: string) {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i++) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
}

function unwrap(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const object = rec(value);
  if (!object) return [value];
  if (object.data !== undefined) return unwrap(object.data);
  if (Array.isArray(object.results)) return object.results;
  if (Array.isArray(object.opportunities)) return object.opportunities;
  return [object];
}

export function parseLukImport(text: string): ImportResult {
  const result: ImportResult = { opportunities: [], errors: [], warnings: [] };
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) return { ...result, errors: ["El archivo supera el máximo de 2 MB."] };
  const input = text.replace(/^\uFEFF/, "").trim();
  if (!input) return { ...result, errors: ["El archivo está vacío."] };
  let rows: unknown[];
  try { rows = unwrap(JSON.parse(input)); }
  catch {
    const lines = input.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length > MAX_IMPORT_ROWS) return { ...result, errors: ["El archivo supera el máximo de 1000 registros."] };
    rows = [];
    lines.forEach((line, index) => {
      try { rows.push(...unwrap(JSON.parse(line))); }
      catch { result.errors.push(`Línea ${index + 1}: JSON inválido.`); }
    });
  }
  if (rows.length > MAX_IMPORT_ROWS) return { ...result, errors: ["El archivo supera el máximo de 1000 registros."] };
  const seen = new Set<string>();
  for (let index = 0; index < rows.length; index++) {
    const raw = rec(rows[index]);
    if (!raw) { result.errors.push(`Fila ${index + 1}: se esperaba un objeto de oferta.`); continue; }
    try {
      const item = importRow(raw, index + 1);
      const key = urlKey(item.sourceUrl);
      if (seen.has(key)) { result.warnings.push(`Oferta duplicada omitida: ${item.title}.`); continue; }
      seen.add(key);
      result.opportunities.push(item);
    } catch (error) { result.errors.push(error instanceof Error ? error.message : `Fila ${index + 1}: no pudo leerse.`); }
  }
  if (result.opportunities.some((o) => o.provenance === "illustrative")) result.warnings.push("Se detectaron registros de prueba; permanecen identificados como ilustrativos.");
  if (result.opportunities.length) result.warnings.push("Archivo importado localmente. No se consultó el portal ni se confirmó disponibilidad actual.");
  return result;
}
