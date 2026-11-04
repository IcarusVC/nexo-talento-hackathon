export type Field = "comercial" | "contabilidad" | "medicina" | "computacion";
export interface PublishedSalary {
  min: number;
  max: number;
  currency: string;
  period: "month" | "year" | "hour";
  basis: "gross" | "net" | "unspecified";
  quote: string;
}
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
  experienceStrictMinimum?: boolean;
  experienceIsRequired: boolean | null;
  acceptsProjects: boolean | null;
  acceptsGraduates: boolean | null;
  studentRequired: boolean | null;
  hoursPerWeek: number | null;
  scheduleText: string;
  remuneration: string;
  salary?: PublishedSalary;
  seniority?: "entry" | "mid" | "senior" | "lead" | "unspecified";
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
  experienceStrictMinimum?: boolean;
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
export interface LearningCourse {
  id: string;
  title: string;
  institution: string;
  country: string;
  url: string;
  modality: string;
  durationText: string;
  priceText: string;
  enrollmentStatus: "open" | "unverified" | "ongoing" | "closed";
  skills: string[];
  prerequisites: string;
  credential: string;
  evidence: string;
  observedAt: string;
  limits: string[];
}
export interface SkillSignal {
  id: string;
  label: string;
  mentions: number;
  requiredCount: number;
  salaryExamples: { title: string; company: string; remuneration: string; sourceUrl: string }[];
  courseCount: number;
}
export interface SalaryGroup {
  key: string;
  label: string;
  country: string;
  currency: string;
  period: PublishedSalary["period"];
  basis: PublishedSalary["basis"];
  seniority: string;
  kind: Opportunity["kind"];
  count: number;
  min: number;
  max: number;
  opportunities: Opportunity[];
  note: string;
}
