import { describe, expect, it } from "vitest";
import { assessAccess, extractRequirements, getResearchOpportunities, parseLukImport } from "./engine";
import { connectsToObjective, getCareerSeed, getLearningCourses, getSalaryGroups, getSkillSignals, recommendLearning } from "./market";
import type { Opportunity } from "./types";

describe("market evidence", () => {
  it("requires a specific skill connection rather than only broad area or soft skills", () => {
    const base = getCareerSeed()[0];
    const target = { ...base, field: "computacion" as const, skills: extractRequirements("SQL. Comunicación. Inglés.").skills };
    const candidate = (text: string, field: Opportunity["field"] = "computacion") => ({ ...base, field, skills: extractRequirements(text).skills });
    expect(connectsToObjective(candidate("Comunicación. Inglés."), target)).toBe(false);
    expect(connectsToObjective(candidate("Python."), target)).toBe(false);
    expect(connectsToObjective(candidate("SQL."), target)).toBe(true);
    expect(connectsToObjective(candidate("SQL.", "general"), target)).toBe(true);
    expect(connectsToObjective(candidate("SQL.", "medicina"), target)).toBe(false);
  });

  it("does not recommend the KPMG audit practice to Signant data analyst based on communication alone", () => {
    const target = getCareerSeed().find((o) => o.title === "Data Analyst I")!;
    const audit = getResearchOpportunities().find((o) => /kpmg/i.test(o.company) && o.kind === "internship")!;
    expect(target).toBeDefined(); expect(audit).toBeDefined();
    expect(connectsToObjective(audit, target)).toBe(false);
  });
  it("keeps seven actual sourced salary observations and explicit uncertainty", () => {
    const jobs = getCareerSeed();
    expect(jobs).toHaveLength(7);
    expect(jobs.every((job) => job.provenance !== "illustrative" && job.status === "unverified" && job.salary?.currency === "USD" && job.salary.period === "month")).toBe(true);
    expect(jobs.find((job) => job.company === "Bci")?.seniority).toBe("senior");
    expect(jobs.find((job) => job.title === "Data Scientist Junior")?.seniority).toBe("unspecified");
  });

  it("does not mix currency, period, pay basis, seniority or internships", () => {
    const base = getCareerSeed()[0];
    const change = (id: string, patch: Partial<Opportunity>): Opportunity => ({ ...base, id, sourceUrl: `https://empleador.cl/ofertas/${id}`, ...patch });
    const offers = [base,
      change("clp", { salary: { ...base.salary!, currency: "CLP" } }),
      change("annual", { salary: { ...base.salary!, period: "year" } }),
      change("net", { salary: { ...base.salary!, basis: "net" } }),
      change("senior", { seniority: "senior" }),
      change("intern", { kind: "internship" }),
    ];
    expect(getSalaryGroups(offers)).toHaveLength(6);
    expect(getSalaryGroups(offers).every((group) => group.count === 1 && group.note.includes("Muestra pequeña"))).toBe(true);
  });

  it("counts unique real postings, excludes synthetic and closed postings", () => {
    const base = getCareerSeed()[0];
    const sql = { id: "sql", label: "SQL", evidence: "SQL requerido", level: "required" as const };
    const real = { ...base, skills: [sql, sql] };
    const offers = [real, { ...real, sourceUrl: real.sourceUrl + "?utm_source=repeat" },
      { ...real, id: "fake", sourceUrl: "https://example.com/1", provenance: "illustrative" as const },
      { ...real, id: "old", sourceUrl: "https://empresa.cl/old", status: "closed" as const }];
    const signal = getSkillSignals(offers).find((skill) => skill.id === "sql")!;
    expect(signal.mentions).toBe(1);
    expect(signal.requiredCount).toBe(1);
    expect(signal.salaryExamples).toHaveLength(1);
  });

  it("recommends only documented matching learning and preserves admission uncertainty", () => {
    const courses = getLearningCourses();
    expect(courses).toHaveLength(8);
    expect(new Set(courses.map((c) => c.id)).size).toBe(8);
    const matches = recommendLearning(["sql"], courses);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.matchedSkills.includes("sql") && m.course.skills.includes("sql"))).toBe(true);
    expect(recommendLearning(["undocumented-skill"], courses)).toEqual([]);
    expect(recommendLearning(["sql"], courses.map((c) => ({ ...c, enrollmentStatus: "closed" })))).toEqual([]);
    expect(courses.filter((c) => c.country === "Chile").every((c) => c.enrollmentStatus === "unverified")).toBe(true);
  });

  it("does not invent missing salary units or accept inverted ranges", () => {
    const raw = { title: "Analista", company: "Empleador", url: "https://empleador.cl/job", salary: { min: 1000, max: 2000, currency: "USD", period: "month", basis: "gross" } };
    const imported = (salary: object) => parseLukImport(JSON.stringify([{ ...raw, salary }])).opportunities[0];
    expect(imported(raw.salary).salary?.basis).toBe("gross");
    expect(imported({ ...raw.salary, period: "" }).salary).toBeUndefined();
    expect(imported({ ...raw.salary, currency: "" }).salary).toBeUndefined();
    expect(imported({ ...raw.salary, max: 500 }).salary).toBeUndefined();
    expect(imported({ ...raw.salary, min: -10 }).salary).toBeUndefined();
  });

  it("does not treat exactly five years as meeting a more-than-five requirement", () => {
    const job = getCareerSeed().find((o) => o.company === "Bci")!;
    const profile = { hoursPerWeek: 40, yearsExperience: 5, isStudent: false, country: "Chile", demonstratedSkills: [] };
    expect(job.experienceStrictMinimum).toBe(true);
    expect(assessAccess(job, profile).barriers.some((b) => b.label === "Experiencia mínima exigida")).toBe(true);
    expect(assessAccess(job, { ...profile, yearsExperience: 6 }).barriers.some((b) => b.label === "Experiencia mínima exigida")).toBe(false);
  });
});
