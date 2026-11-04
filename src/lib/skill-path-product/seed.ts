import type { CandidateProfile, Company, Institution, LearningOffering, ProductAccount, ProductApplication, ProductJob } from "./types";

export const ACCOUNTS: ProductAccount[] = [
  { id: "SP-CAND-01", name: "Ana Garrido", email: "candidato@example.com", role: "candidate" },
  { id: "SP-CAND-02", name: "Bruno Ortega", email: "candidato2@example.com", role: "candidate" },
  { id: "SP-REC-01", name: "Elena Paredes", email: "reclutador@example.com", role: "recruiter", companyId: "SP-EMP-01" },
  { id: "SP-REC-02", name: "Diego Herrera", email: "reclutador2@example.com", role: "recruiter", companyId: "SP-EMP-01" },
  { id: "SP-REC-03", name: "Camila Abarca", email: "reclutador3@example.com", role: "recruiter", companyId: "SP-EMP-02" },
  { id: "SP-SUP-01", name: "Gabriela Ibarra", email: "supervisor@example.com", role: "supervisor", companyId: "SP-EMP-01" },
  { id: "SP-SUP-02", name: "Hugo Rojas", email: "supervisor2@example.com", role: "supervisor", companyId: "SP-EMP-02" },
  { id: "SP-EDU-01", name: "Equipo Platzi · demo", email: "platzi@example.com", role: "institution", institutionId: "SP-INST-01" },
  { id: "SP-EDU-02", name: "Equipo U. de Chile · demo", email: "uchile@example.com", role: "institution", institutionId: "SP-INST-02" },
];
export const INSTITUTIONS: Institution[] = [
  { id: "SP-INST-01", name: "Platzi", kind: "Plataforma educativa", website: "https://platzi.com/cursos/", agreement: "simulated", discountPercent: 20 },
  { id: "SP-INST-02", name: "Universidad de Chile", kind: "Universidad", website: "https://uchile.cl/educacioncontinua", agreement: "simulated", discountPercent: null },
];
export function seedCompanies(): Company[] { return [
  { id: "SP-EMP-01", name: "Andes Digital · empresa demo", requiredSkills: ["Comunicación"], recommendedSkills: ["Inteligencia artificial", "Trabajo en equipo"] },
  { id: "SP-EMP-02", name: "Pacífico Innovación · empresa demo", requiredSkills: ["Trabajo en equipo"], recommendedSkills: ["Pensamiento crítico"] },
]; }
const CREATED = "2026-11-01T12:00:00.000Z";
export function seedJobs(): ProductJob[] {
  const records = [
    ["SP-JOB-01", "SP-EMP-01", "SP-REC-01", "Analista de datos junior", ["SQL", "Excel", "Comunicación"], ["Python"], 30],
    ["SP-JOB-02", "SP-EMP-01", "SP-REC-01", "Desarrollador de soluciones con IA", ["Python", "Inteligencia artificial", "Trabajo en equipo"], ["SQL"], 40],
    ["SP-JOB-03", "SP-EMP-01", "SP-REC-02", "Analista de marketing digital", ["Marketing digital", "Excel", "Comunicación"], ["Presentaciones", "Creatividad"], 20],
    ["SP-JOB-04", "SP-EMP-02", "SP-REC-03", "Coordinador de emprendimiento", ["Emprendimiento", "Presentaciones", "Trabajo en equipo"], ["Liderazgo"], 30],
    ["SP-JOB-05", "SP-EMP-02", "SP-REC-03", "Analista de automatización", ["Python", "SQL", "Pensamiento crítico"], ["Inteligencia artificial"], 40],
  ] as const;
  return records.map(([id, companyId, recruiterId, title, requiredSkills, recommendedSkills, hoursPerWeek]) => ({ id, companyId, recruiterId, title, requiredSkills: [...requiredSkills], recommendedSkills: [...recommendedSkills], hoursPerWeek, description: "Oportunidad ficticia para explorar habilidades, evidencias y selección humana en la demostración de Skill path.", location: "Santiago, Chile", modality: "Híbrida", closesAt: "2026-12-31", state: "Activa", createdAt: CREATED, source: "demo" }));
}
export function seedProfiles(): CandidateProfile[] { return ACCOUNTS.filter((a) => a.role === "candidate").map((a) => ({ accountId: a.id, headline: "Perfil por completar", bio: "", skills: [], availabilityHours: 20, goal: null })); }
export function seedApplications(): ProductApplication[] {
  return [
    { id: "SP-APP-01", candidateId: "SP-CAND-02", jobId: "SP-JOB-01", stage: "En revisión" as const, stages: ["Recibida", "En revisión"] as const },
    { id: "SP-APP-02", candidateId: "SP-CAND-02", jobId: "SP-JOB-03", stage: "Oferta" as const, stages: ["Recibida", "En revisión", "Preseleccionada", "Entrevista", "Oferta"] as const },
    { id: "SP-APP-03", candidateId: "SP-CAND-02", jobId: "SP-JOB-04", stage: "Recibida" as const, stages: ["Recibida"] as const },
  ].map(({ stages, ...entry }) => {
    const history: ProductApplication["history"] = stages.map((stage, index) => ({ at: `2026-11-0${index < 2 ? 1 : 2}T${String(12 + index).padStart(2, "0")}:00:00.000Z`, actorId: index === 0 ? entry.candidateId : entry.jobId === "SP-JOB-03" ? "SP-REC-02" : "SP-REC-01", from: index === 0 ? null : stages[index - 1], to: stage, note: "Antecedente ficticio precargado para recorrer el embudo; no corresponde a una persona real." }));
    return { ...entry, createdAt: history[0].at, updatedAt: history[history.length - 1].at, history };
  });
}
export function seedOfferings(): LearningOffering[] {
  const common = { source: "demo" as const, published: true, timezone: "America/Santiago", priceCLP: null, capacity: 30, startsAt: null, place: null, rubric: [] as string[], prerequisites: "Revisar los requisitos con la institución. Programa ficticio de demostración." };
  return [
    ...["SQL", "Python", "Inteligencia artificial"].map((skill, index) => ({ ...common, id: `SP-COURSE-0${index + 1}`, institutionId: "SP-INST-01", kind: "course" as const, title: `${skill}: ruta práctica · demo`, description: "Curso ilustrativo del convenio ficticio. Contenidos, precio y descuento no son una oferta comercial vigente.", skills: [skill], skillType: "technical" as const, duration: "12 horas · ejemplo", modality: "En línea, a tu ritmo", discountPercent: 20, url: "https://platzi.com/cursos/" })),
    { ...common, id: "SP-COURSE-04", institutionId: "SP-INST-02", kind: "postgraduate", title: "Especialización avanzada en IA · demo", description: "Ejemplo de ruta avanzada, sin equivalencia con un programa oficial ni garantía de admisión.", skills: ["Inteligencia artificial", "Python"], skillType: "technical", duration: "6 meses · ejemplo", modality: "Híbrida", prerequisites: "Título o grado afín y base de programación; requisitos ilustrativos por confirmar con la institución.", discountPercent: null, url: "https://uchile.cl/educacioncontinua" },
    { ...common, id: "SP-COURSE-05", institutionId: "SP-INST-02", kind: "certification", title: "Certificación de analítica aplicada · demo", description: "Programa y certificación simulados para recorrer una solicitud de formación.", skills: ["Excel", "SQL"], skillType: "technical", duration: "40 horas · ejemplo", modality: "En línea", discountPercent: null, url: "https://uchile.cl/educacioncontinua" },
    ...[
      ["Pitch de ideas", ["Presentaciones", "Comunicación"], "2026-12-04T18:00:00-03:00", "Auditorio de demostración, Santiago", "Claridad del problema, propuesta y respuesta a preguntas"],
      ["Hackathon colaborativa", ["Trabajo en equipo", "Pensamiento crítico"], "2026-12-05T09:00:00-03:00", "Laboratorio de demostración, Santiago", "Aporte individual documentado y colaboración observada"],
      ["Desafío de marketing", ["Creatividad", "Comunicación"], "2026-12-09T17:00:00-03:00", "Sala virtual de demostración", "Argumentación de la campaña y uso de retroalimentación"],
      ["Feria de emprendimiento", ["Liderazgo", "Presentaciones"], "2026-12-12T10:00:00-03:00", "Espacio de demostración, Santiago", "Coordinación del equipo y presentación del aprendizaje"],
    ].map(([title, skills, startsAt, place, rubric], index) => ({ ...common, id: `SP-ACT-0${index + 1}`, institutionId: "SP-INST-02", kind: "activity" as const, title: `${title} · demo`, description: "Competencia ficticia. Inscribirse o participar no acredita habilidades: hace falta evaluación documentada.", skills: skills as string[], skillType: "soft" as const, duration: "3 horas · ejemplo", modality: index === 2 ? "En línea" : "Presencial", startsAt: startsAt as string, place: place as string, rubric: [rubric as string], discountPercent: null, url: null })),
  ];
}
