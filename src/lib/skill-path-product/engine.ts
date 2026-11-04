import type { CandidateEvidence, CandidateProfile, Company, LearningEnrollment, LearningOffering, ProductAccount, ProductApplication, ProductAuditEvent, ProductJob, ProductMatch, ProductWorkspace, SkillDemand } from "./types";
import { ACCOUNTS, INSTITUTIONS, seedApplications, seedCompanies, seedJobs, seedOfferings, seedProfiles } from "./seed";
import { normalize, ProductError } from "./validation";

export interface StoredAttachment { id: string; evidenceId: string; name: string; mimeType: string; size: number; base64: string }
export interface StoredAudit extends ProductAuditEvent { companyId?: string; candidateId?: string; institutionId?: string }
export interface ProductState { schemaVersion: 1; version: number; companies: Company[]; jobs: ProductJob[]; profiles: CandidateProfile[]; evidence: CandidateEvidence[]; applications: ProductApplication[]; offerings: LearningOffering[]; enrollments: LearningEnrollment[]; attachments: StoredAttachment[]; audit: StoredAudit[]; requests: { accountId: string; key: string; hash: string; result: { ok: true; version: number; message: string; targetId: string } }[] }
export function initialState(): ProductState { return { schemaVersion: 1, version: 0, companies: seedCompanies(), jobs: seedJobs(), profiles: seedProfiles(), evidence: [], applications: seedApplications(), offerings: seedOfferings(), enrollments: [], attachments: [], audit: [], requests: [] }; }
export function accountFor(id: string): ProductAccount { const account = ACCOUNTS.find((a) => a.id === id); if (!account) throw new ProductError("ACCOUNT_NOT_FOUND", "Selecciona una cuenta de demostración válida.", 404); return account; }
export function managesJob(account: ProductAccount, job: ProductJob): boolean { return job.companyId === account.companyId && (account.role === "supervisor" || account.role === "recruiter" && job.recruiterId === account.id); }
export function chileDate(now: Date): string { const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now); return ["year", "month", "day"].map((part) => parts.find((p) => p.type === part)!.value).join("-"); }
export function jobOpen(job: ProductJob, now: Date): boolean { return job.state === "Activa" && job.closesAt >= chileDate(now); }
export function visibleEvidence(state: ProductState, account: ProductAccount): CandidateEvidence[] {
  if (account.role === "candidate") return state.evidence.filter((e) => e.candidateId === account.id);
  if (account.role === "institution") return [];
  const applicants = new Set(state.applications.filter((a) => state.jobs.some((j) => j.id === a.jobId && managesJob(account, j))).map((a) => a.candidateId));
  return state.evidence.filter((e) => applicants.has(e.candidateId) || e.kind === "experience" && e.companyId === account.companyId);
}
export function matchJob(state: ProductState, profile: CandidateProfile, job: ProductJob, now: Date): ProductMatch {
  const own = state.evidence.filter((e) => e.candidateId === profile.accountId);
  const verifiedSkills = new Set(own.filter((e) => e.status === "verified").flatMap((e) => e.skills.map(normalize)));
  const declaredSkills = new Set([...profile.skills, ...own.filter((e) => e.status !== "verified").flatMap((e) => e.skills)].map(normalize));
  const required = [...job.requiredSkills];
  return { jobId: job.id, required, verified: required.filter((s) => verifiedSkills.has(normalize(s))), declared: required.filter((s) => !verifiedSkills.has(normalize(s)) && declaredSkills.has(normalize(s))), missing: required.filter((s) => !verifiedSkills.has(normalize(s)) && !declaredSkills.has(normalize(s))), hoursCompatible: profile.availabilityHours >= job.hoursPerWeek, eligibleToApply: jobOpen(job, now), explanation: "Contraste de requisitos publicados con evidencias y autodeclaraciones; no es una probabilidad de contratación. Sin evidencia no equivale a falta de capacidad. Puedes postular con brechas mientras la vacante siga vigente." };
}
const softActivities: Record<string, string> = { comunicacion: "Competencia de pitch", presentaciones: "Competencia de pitch", "trabajo en equipo": "Hackathon colaborativa", "pensamiento critico": "Hackathon con evaluación de decisiones", creatividad: "Desafío de marketing", liderazgo: "Competencia de emprendimiento", empatia: "Competencia de emprendimiento con entrevistas a usuarios", negociacion: "Competencia de emprendimiento con negociación observada", adaptabilidad: "Hackathon con cambios de requisitos", "resolucion de problemas": "Hackathon con evaluación de decisiones", "gestion del tiempo": "Hackathon con planificación observada", "inteligencia emocional": "Desafío colaborativo con retroalimentación", "escucha activa": "Competencia de pitch con preguntas y retroalimentación" };
const technicalSkills = new Set(["sql", "excel", "python", "inteligencia artificial", "marketing digital", "emprendimiento", "javascript", "typescript", "react", "power bi", "tableau", "contabilidad", "analisis de datos", "machine learning", "estadistica", "git", "html", "css", "java", "c++", "c#", "node.js", "aws", "azure", "seo"]);
export function skillDemand(jobs: ProductJob[]): SkillDemand[] {
  const demand = new Map<string, { skill: string; count: number }>();
  for (const job of jobs) { const seen = new Set<string>(); for (const skill of [...job.requiredSkills, ...job.recommendedSkills]) { const key = normalize(skill); if (seen.has(key)) continue; seen.add(key); const current = demand.get(key); demand.set(key, { skill: current?.skill ?? skill, count: (current?.count ?? 0) + 1 }); } }
  return [...demand].map(([key, value]) => ({ skill: value.skill, vacancies: value.count, totalVacancies: jobs.length, kind: softActivities[key] ? "soft" as const : technicalSkills.has(key) ? "technical" as const : "unknown" as const, suggestedActivity: softActivities[key] ?? null })).sort((a, b) => b.vacancies - a.vacancies || a.skill.localeCompare(b.skill));
}
export function workspace(state: ProductState, accountId: string, now: Date): ProductWorkspace {
  const account = accountFor(accountId);
  const isEmployer = account.role === "recruiter" || account.role === "supervisor";
  const applications = state.applications.filter((a) => account.role === "candidate" ? a.candidateId === account.id : isEmployer && state.jobs.some((j) => j.id === a.jobId && managesJob(account, j)));
  const jobs = account.role === "institution" ? [] : state.jobs.filter((j) => account.role === "candidate" ? j.state === "Activa" || applications.some((a) => a.jobId === j.id) : managesJob(account, j));
  const evidence = visibleEvidence(state, account);
  const candidateIds = new Set(account.role === "candidate" ? [account.id] : isEmployer ? [...applications.map((a) => a.candidateId), ...evidence.map((e) => e.candidateId)] : []);
  const profiles = state.profiles.filter((p) => candidateIds.has(p.accountId));
  const offerings = state.offerings.filter((o) => account.role === "institution" ? o.institutionId === account.institutionId : o.published);
  const enrollments = state.enrollments.filter((e) => account.role === "candidate" ? e.candidateId === account.id : account.role === "institution" && state.offerings.some((o) => o.id === e.offeringId && o.institutionId === account.institutionId));
  const institutionCandidateIds = new Set(enrollments.map((e) => e.candidateId));
  const accounts = ACCOUNTS.filter((a) => a.id === account.id || isEmployer && (a.companyId === account.companyId || candidateIds.has(a.id)) || account.role === "institution" && institutionCandidateIds.has(a.id));
  const demandJobs = state.jobs.filter((j) => jobOpen(j, now) && (isEmployer ? j.companyId === account.companyId : true));
  const recruiterMetrics = account.role === "supervisor" ? ACCOUNTS.filter((a) => a.role === "recruiter" && a.companyId === account.companyId).map((a) => {
    const recruiterJobs = state.jobs.filter((j) => j.recruiterId === a.id && j.companyId === account.companyId); const ids = new Set(recruiterJobs.map((j) => j.id)); const entries = state.applications.filter((p) => ids.has(p.jobId));
    return { accountId: a.id, name: a.name, vacancies: recruiterJobs.length, applications: entries.length, interviewed: entries.filter((p) => p.history.some((event) => event.to === "Entrevista")).length, pending: entries.filter((p) => ["Recibida", "En revisión", "Preseleccionada"].includes(p.stage)).length, hired: entries.filter((p) => p.stage === "Contratada").length };
  }) : [];
  const audit = state.audit.filter((e) => account.role === "candidate" ? e.candidateId === account.id : account.role === "institution" ? e.institutionId === account.institutionId : e.companyId === account.companyId && (account.role === "supervisor" || e.actorId === account.id || jobs.some((j) => j.id === e.targetId) || applications.some((a) => a.id === e.targetId))).map(({ id, at, actorId, action, targetId, summary }) => ({ id, at, actorId, action, targetId, summary }));
  return structuredClone({ version: state.version, account, accounts, companies: account.role === "institution" ? [] : state.companies.filter((c) => account.role === "candidate" || c.id === account.companyId), institutions: account.role === "institution" ? INSTITUTIONS.filter((i) => i.id === account.institutionId) : INSTITUTIONS, jobs, profiles, evidence, applications, offerings, enrollments, matches: account.role === "candidate" ? jobs.map((j) => matchJob(state, profiles[0], j, now)) : [], demand: skillDemand(demandJobs), recruiterMetrics, audit, source: { label: "Muestra ficticia de vacantes creadas para la demostración del producto; no representa el mercado laboral.", synthetic: true, capturedAt: now.toISOString(), vacancyCount: demandJobs.length, scope: isEmployer ? "Vacantes vigentes de tu empresa" : "Vacantes vigentes de las empresas de demostración" } });
}
