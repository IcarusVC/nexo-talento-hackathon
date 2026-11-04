/** Product extension authorized after the brief. All accounts and partnerships are demo data. */
export type ProductRole = "candidate" | "recruiter" | "supervisor" | "institution";
export interface ProductAccount { id: string; name: string; email: string; role: ProductRole; companyId?: string; institutionId?: string }
export interface Company { id: string; name: string; requiredSkills: string[]; recommendedSkills: string[] }
export interface Institution { id: string; name: string; kind: "Plataforma educativa" | "Universidad"; website: string; agreement: "simulated"; discountPercent: number | null }
export const PRODUCT_STAGES = ["Recibida", "En revisión", "Preseleccionada", "Entrevista", "Oferta", "Contratada", "Descartada"] as const;
export type ProductStage = typeof PRODUCT_STAGES[number];
export interface ProductJob { id: string; companyId: string; recruiterId: string; title: string; description: string; requiredSkills: string[]; recommendedSkills: string[]; location: string; modality: string; hoursPerWeek: number; closesAt: string; state: "Activa" | "Pausada" | "Cerrada"; createdAt: string; source: "demo" }
export interface CandidateProfile { accountId: string; headline: string; bio: string; skills: string[]; availabilityHours: number; goal: { title: string; jobId: string | null; skills: string[] } | null }
export interface EvidenceAttachment { name: string; mimeType: string; size: number; id: string }
export interface CandidateEvidence { id: string; candidateId: string; kind: "experience" | "project" | "achievement" | "activity"; title: string; description: string; skills: string[]; url: string | null; companyId: string | null; startedAt: string | null; endedAt: string | null; status: "pending" | "verified" | "needs_information"; reviewerId: string | null; reviewedAt: string | null; reviewNote: string | null; createdAt: string; attachment: EvidenceAttachment | null; enrollmentId?: string | null }
export interface ProductApplication { id: string; candidateId: string; jobId: string; stage: ProductStage; createdAt: string; updatedAt: string; history: { at: string; actorId: string; from: ProductStage | null; to: ProductStage; note: string }[] }
export interface LearningOffering { id: string; institutionId: string; kind: "course" | "certification" | "postgraduate" | "activity"; title: string; description: string; skills: string[]; skillType: "technical" | "soft"; duration: string; modality: string; prerequisites: string; priceCLP: number | null; discountPercent: number | null; startsAt: string | null; timezone: string; place: string | null; capacity: number | null; url: string | null; published: boolean; rubric: string[]; source: "demo" }
export interface LearningEnrollment { id: string; candidateId: string; offeringId: string; goal: string; status: "requested" | "reviewed" | "completed"; createdAt: string; evaluation: { reviewerId: string; at: string; note: string; demonstratedSkills: string[] } | null }
export interface ProductMatch { jobId: string; required: string[]; verified: string[]; declared: string[]; missing: string[]; hoursCompatible: boolean; eligibleToApply: boolean; explanation: string }
export interface SkillDemand { skill: string; vacancies: number; totalVacancies: number; kind: "technical" | "soft" | "unknown"; suggestedActivity: string | null }
export interface RecruiterMetric { accountId: string; name: string; vacancies: number; applications: number; interviewed: number; pending: number; hired: number }
export interface ProductAuditEvent { id: string; at: string; actorId: string; action: string; targetId: string; summary: string }
export interface ProductWorkspace {
  version: number; account: ProductAccount; accounts: ProductAccount[]; companies: Company[]; institutions: Institution[];
  jobs: ProductJob[]; profiles: CandidateProfile[]; evidence: CandidateEvidence[]; applications: ProductApplication[];
  offerings: LearningOffering[]; enrollments: LearningEnrollment[]; matches: ProductMatch[]; demand: SkillDemand[];
  recruiterMetrics: RecruiterMetric[]; audit: ProductAuditEvent[];
  source: { label: string; synthetic: true; capturedAt: string; vacancyCount: number; scope: string };
}
export type ProductActionPayload =
 | { type: "save_profile"; headline: string; bio: string; skills: string[]; availabilityHours: number }
 | { type: "save_goal"; title: string; jobId: string | null; skills: string[] }
 | { type: "add_evidence"; kind: "experience" | "project" | "achievement"; title: string; description: string; skills: string[]; url: string | null; companyId: string | null; startedAt: string | null; endedAt: string | null; attachment?: { name: string; mimeType: string; base64: string } }
 | { type: "review_evidence"; evidenceId: string; status: "verified" | "needs_information"; note: string }
 | { type: "apply"; jobId: string }
 | { type: "create_job"; title: string; description: string; requiredSkills: string[]; recommendedSkills: string[]; location: string; modality: string; hoursPerWeek: number; closesAt: string; recruiterId?: string }
 | { type: "move_application"; applicationId: string; stage: ProductStage; note: string; humanConfirmed: boolean }
 | { type: "set_company_skills"; requiredSkills: string[]; recommendedSkills: string[] }
 | { type: "save_offering"; offering: Omit<LearningOffering, "id" | "institutionId" | "source"> & { id?: string } }
 | { type: "enroll"; offeringId: string; goal: string }
 | { type: "evaluate_enrollment"; enrollmentId: string; note: string; demonstratedSkills: string[]; completed: boolean };
export interface ProductActionRequest { accountId: string; expectedVersion: number; idempotencyKey: string; payload: ProductActionPayload }
export interface ProductActionResult { ok: true; version: number; message: string; targetId: string }
