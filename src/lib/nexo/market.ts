import jobData from "@/data/nexo/market-jobs.json";
import learningData from "@/data/nexo/learning-paths.json";
import { parseLukImport } from "./engine";
import type { LearningCourse, Opportunity, SalaryGroup, SkillSignal } from "./types";
export type { LearningCourse, SalaryGroup, SkillSignal } from "./types";

export function getCareerSeed(): Opportunity[] {
  return parseLukImport(JSON.stringify(jobData.jobs)).opportunities;
}

export function getLearningCourses(): LearningCourse[] {
  return learningData.courses as LearningCourse[];
}

export function uniqueRealOpportunities(offers: Opportunity[]): Opportunity[] {
  const seen = new Set<string>();
  return offers.filter((offer) => {
    if (offer.provenance === "illustrative" || offer.status === "closed" || offer.kind === "curricular" || offer.kind === "program") return false;
    let key = offer.id;
    try {
      const url = new URL(offer.sourceUrl);
      url.hash = "";
      for (const name of [...url.searchParams.keys()]) if (/^(utm_|gclid|fbclid)/i.test(name)) url.searchParams.delete(name);
      key = url.href.replace(/\/$/, "");
    } catch { return false; }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getSkillSignals(offers: Opportunity[]): SkillSignal[] {
  const courses = getLearningCourses();
  const signals = new Map<string, SkillSignal>();
  for (const offer of uniqueRealOpportunities(offers)) {
    for (const skill of new Map(offer.skills.map((s) => [s.id, s])).values()) {
      const signal = signals.get(skill.id) ?? { id: skill.id, label: skill.label, mentions: 0, requiredCount: 0, salaryExamples: [], courseCount: courses.filter((c) => c.skills.includes(skill.id) && c.enrollmentStatus !== "closed").length };
      signal.mentions++;
      if (skill.level === "required") signal.requiredCount++;
      if (offer.salary) signal.salaryExamples.push({ title: offer.title, company: offer.company, remuneration: offer.remuneration, sourceUrl: offer.sourceUrl });
      signals.set(skill.id, signal);
    }
  }
  // Frequency is confined to the visible sample, never interpreted as causal salary value.
  return [...signals.values()].sort((a, b) => b.mentions - a.mentions || b.requiredCount - a.requiredCount || a.label.localeCompare(b.label));
}

export function recommendLearning(skillIds: string[], courses = getLearningCourses()): { course: LearningCourse; matchedSkills: string[] }[] {
  const requested = new Set(skillIds);
  return courses.filter((course) => course.enrollmentStatus !== "closed")
    .map((course) => ({ course, matchedSkills: [...new Set(course.skills.filter((s) => requested.has(s)))] }))
    .filter((result) => result.matchedSkills.length > 0)
    .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length || a.course.institution.localeCompare(b.course.institution));
}

function seniority(offer: Opportunity): string {
  if (offer.kind === "internship") return "Práctica";
  if (offer.seniority) return { entry: "Inicial", mid: "Semi senior", senior: "Senior", lead: "Liderazgo", unspecified: "Nivel por confirmar" }[offer.seniority];
  if (/semi.?senior|\bssr\b/i.test(offer.title)) return "Semi senior";
  if (/senior|\bsr\b|lead|head|manager|jefe|líder/i.test(offer.title)) return "Senior / liderazgo";
  if (/junior|\bjr\b|trainee/i.test(offer.title) || offer.kind === "entry_job") return "Inicial";
  return "Nivel por confirmar";
}

export function getSalaryGroups(offers: Opportunity[]): SalaryGroup[] {
  const groups = new Map<string, SalaryGroup>();
  for (const opportunity of uniqueRealOpportunities(offers)) {
    const salary = opportunity.salary;
    if (!salary) continue;
    const level = seniority(opportunity);
    const key = [opportunity.country, salary.currency, salary.period, salary.basis, level, opportunity.kind].join("|");
    const periodLabel = { month: "mes", year: "año", hour: "hora" }[salary.period];
    const basisLabel = { gross: "bruto", net: "líquido", unspecified: "base por confirmar" }[salary.basis];
    const group = groups.get(key) ?? { key, label: `${opportunity.country} · ${level} · ${salary.currency}/${periodLabel} · ${basisLabel}`, country: opportunity.country, currency: salary.currency, period: salary.period, basis: salary.basis, seniority: level, kind: opportunity.kind, count: 0, min: salary.min, max: salary.max, opportunities: [], note: "Rangos publicados por cargos de esta muestra. No son sueldo promedio, ingreso garantizado ni efecto causal de una habilidad." };
    group.count++;
    group.min = Math.min(group.min, salary.min);
    group.max = Math.max(group.max, salary.max);
    group.opportunities.push(opportunity);
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ ...group, opportunities: group.opportunities.sort((a, b) => b.salary!.min - a.salary!.min), note: (group.count < 3 ? "Muestra pequeña: menos de 3 avisos comparables. " : "") + group.note }));
}
