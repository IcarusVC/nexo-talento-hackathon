export type Field = "comercial" | "contabilidad" | "medicina" | "computacion";
export interface SkillRequirement {
  id: string;
  label: string;
  evidence: string;
  level: "required" | "preferred" | "mentioned";
}
export interface CurriculumEvidence {
  competency: string;
  course: string | null;
  coverage: string;
  location: string;
  sourceUrl: string;
}
export interface ResearchProgram {
  id: string;
  field: Field;
  institution: string;
  country: string;
  name: string;
  version: string;
  sourceUrl: string;
  evidence: CurriculumEvidence[];
}
export interface Opportunity {
  id: string;
  title: string;
  company: string;
  field: Field | "general";
  country: string;
  location: string;
  sourceUrl: string;
  observedAt: string;
  provenance: "research" | "imported" | "illustrative";
  kind: "internship" | "entry_job" | "job" | "program" | "curricular";
  status: "observed" | "unverified" | "closed" | "program";
  description: string;
  skills: SkillRequirement[];
  experienceMinYears: number | null;
  experienceIsRequired: boolean | null;
  acceptsProjects: boolean | null;
  acceptsGraduates: boolean | null;
  studentRequired: boolean | null;
  hoursPerWeek: number | null;
  scheduleText: string;
  remuneration: string;
  supervision: string;
  limits: string[];
}
export interface StudentProfile {
  hoursPerWeek: number;
  yearsExperience: number;
  isStudent: boolean;
  country: string;
  demonstratedSkills: string[];
}
export interface FitReason { label: string; detail: string; }
export interface FitAssessment {
  status: "compatible" | "needs_review" | "incompatible";
  matched: FitReason[];
  unknown: FitReason[];
  barriers: FitReason[];
}
export interface CurriculumMatch {
  skill: SkillRequirement;
  status: "declared" | "elective" | "unverified";
  evidence: CurriculumEvidence[];
  note: string;
}
export interface ExtractedRequirements {
  skills: SkillRequirement[];
  experienceMinYears: number | null;
  experienceIsRequired: boolean | null;
  acceptsProjects: boolean | null;
  acceptsGraduates: boolean | null;
  studentRequired: boolean | null;
  hoursPerWeek: number | null;
}
export interface ImportResult {
  opportunities: Opportunity[];
  errors: string[];
  warnings: string[];
}
