"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Check, CheckCheck, ChevronRight, ClipboardCheck, Download, FileJson, GraduationCap, Link2, MapPin, Plus, Search, Sparkles, Upload, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { assessAccess, compareCurriculum, extractRequirements, getResearchOpportunities, getResearchPrograms, parseLukImport } from "@/lib/nexo/engine";
import type { Field, FitAssessment, Opportunity, ResearchProgram, StudentProfile } from "@/lib/nexo/types";
import { getCareerSeed } from "@/lib/nexo/market";
import { CareerJourney } from "./career-journey";
import journeyStyles from "./career-journey.module.css";
import styles from "./workspace.module.css";

type Section = "journey" | "opportunities" | "university" | "route" | "import";
type Action = { id: string; programId: string; opportunityId: string; title: string; owner: string; due: string; status: "pending" | "active" | "done" };
type Evidence = { id: string; title: string; detail: string; url: string; skillId: string };
const STORAGE = "nexo-talento-workspace-v1";
const MAX_IMPORT = 2 * 1024 * 1024;
const FIELDS: Record<Field | "general", string> = { comercial: "Ingeniería Comercial", contabilidad: "Contador Auditor", medicina: "Medicina", computacion: "Computación", general: "Varias áreas" };
const KINDS: Record<Opportunity["kind"], string> = { internship: "Práctica", entry_job: "Empleo inicial", job: "Empleo", program: "Programa", curricular: "Experiencia curricular" };
const STATUSES: Record<Opportunity["status"], string> = { observed: "Publicación observada", unverified: "Vigencia por confirmar", closed: "Referencia histórica", program: "Vía institucional" };
const LEVELS = { required: "Requerido", preferred: "Deseable", mentioned: "Mencionado" };
const DEFAULT_PROFILE: StudentProfile = { hoursPerWeek: 20, yearsExperience: 0, isStudent: true, country: "Chile", demonstratedSkills: [] };
const NAV: { id: Section; label: string; icon: typeof Search; description: string }[] = [
  { id: "journey", label: "Mi próximo paso", icon: Sparkles, description: "Del trabajo a tu ruta" },
  { id: "opportunities", label: "Oportunidades", icon: BriefcaseBusiness, description: "Requisitos con contexto" },
  { id: "university", label: "Universidad", icon: GraduationCap, description: "Formación y decisiones" },
  { id: "route", label: "Mi ruta", icon: UserRound, description: "Evidencias y acceso" },
  { id: "import", label: "Importar Luk", icon: FileJson, description: "Nuevas señales laborales" },
];

function clean(value: unknown, max = 1000): string { return typeof value === "string" ? value.slice(0, max) : ""; }
function externalUrl(value: string): string | null { try { const u = new URL(value); return ["https:", "http:"].includes(u.protocol) ? u.href : null; } catch { return null; } }
function dateLabel(value: string): string { if (!value) return "Sin fecha"; const date = new Date(value.slice(0, 10) + "T12:00:00"); return Number.isNaN(date.valueOf()) ? value : date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }); }
function normalize(value: string): string { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function key(): string { return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function opportunityUrlKey(value: string): string | null {
  const safe = externalUrl(value);
  if (!safe) return null;
  const url = new URL(safe);
  url.hash = "";
  for (const parameter of [...url.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(parameter)) url.searchParams.delete(parameter);
  return url.href.replace(/\/$/, "");
}
function dedupeOpportunities(values: Opportunity[]): Opportunity[] {
  const ids = new Set<string>();
  const urls = new Set<string>();
  return values.filter((opportunity) => {
    const url = opportunityUrlKey(opportunity.sourceUrl);
    const duplicate = ids.has(opportunity.id) || (url !== null && urls.has(url));
    ids.add(opportunity.id);
    if (url) urls.add(url);
    return !duplicate;
  });
}
function opportunityCountries(value: string): string[] { return [...new Set(value.split("/").map((country) => country.trim()).filter(Boolean))]; }
function saveJson(name: string, value: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }

function SourceLink({ url, children = "Ver fuente original" }: { url: string; children?: ReactNode }) {
  const safe = externalUrl(url);
  return safe ? <a className={styles.sourceLink} href={safe} target="_blank" rel="noopener noreferrer">{children}<ArrowUpRight size={14} aria-hidden="true" /></a> : <span className={styles.muted}>Fuente no disponible</span>;
}
function SelectField({ label, value, onChange, children, id }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; id: string }) {
  return <label className={styles.field} htmlFor={id}><span>{label}</span><select id={id} value={value} onChange={(e) => onChange(e.target.value)}>{children}</select></label>;
}
function Note({ children }: { children: ReactNode }) { return <div className={styles.note}><BookOpen size={16} aria-hidden="true" /><p>{children}</p></div>; }
function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className={styles.empty}><Search size={25} aria-hidden="true" /><h3>{title}</h3><p>{children}</p></div>; }
function FitSummary({ fit }: { fit: FitAssessment }) {
  const labels = { compatible: "Condiciones compatibles", needs_review: "Falta confirmar condiciones", incompatible: "Hay barreras de acceso" };
  const groups = [{ title: "Coincidencias", values: fit.matched, tone: styles.good }, { title: "Por confirmar", values: fit.unknown, tone: styles.pending }, { title: "Barreras identificadas", values: fit.barriers, tone: styles.barrier }];
  return <div className={styles.fit}><div className={styles.fitHeading}><ClipboardCheck size={18} /><h3>{labels[fit.status]}</h3></div>{groups.filter((g) => g.values.length).map((group) => <div key={group.title} className={styles.fitGroup}><span className={`${styles.eyebrow} ${group.tone}`}>{group.title}</span>{group.values.map((reason, i) => <div className={styles.reason} key={`${reason.label}-${i}`}><strong>{reason.label}</strong><p>{reason.detail}</p></div>)}</div>)}</div>;
}

export function NexoWorkspace() {
  const [programs] = useState<ResearchProgram[]>(() => getResearchPrograms());
  const [seed] = useState<Opportunity[]>(() => dedupeOpportunities([...getCareerSeed(), ...getResearchOpportunities()]));
  const [section, setSection] = useState<Section>("journey");
  const [careerOffers, setCareerOffers] = useState<Opportunity[]>([]);
  const [importBatches, setImportBatches] = useState<string[]>([]);
  const [profile, setProfile] = useState<StudentProfile>(DEFAULT_PROFILE);
  const [actions, setActions] = useState<Action[]>([]);
  const [evidences, setEvidences] = useState<Evidence[]>([]);
  const [ready, setReady] = useState(false);
  const [storageIssue, setStorageIssue] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState(() => getCareerSeed()[0]?.id || seed.find((o) => o.company.toLowerCase().includes("prize"))?.id || seed[0]?.id || "");
  const [programId, setProgramId] = useState(() => programs.find((p) => p.id === "COM-CL-UCH")?.id || programs[0]?.id || "");
  const [search, setSearch] = useState("");
  const [field, setField] = useState("all");
  const [kind, setKind] = useState("all");
  const [country, setCountry] = useState("all");
  const [visibleCount, setVisibleCount] = useState(8);
  const [programField, setProgramField] = useState("all");
  const [programCountry, setProgramCountry] = useState("all");
  const [importText, setImportText] = useState("");
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [analysisText, setAnalysisText] = useState("Buscamos analista con Excel y SQL. Power BI deseable. Se aceptan proyectos académicos. Jornada de 20 horas semanales.");
  const [analysis, setAnalysis] = useState<ReturnType<typeof extractRequirements> | null>(null);
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceDetail, setEvidenceDetail] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceSkill, setEvidenceSkill] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionOwner, setActionOwner] = useState("");
  const [actionDate, setActionDate] = useState("");
  const detailRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try {
      const raw = localStorage.getItem(STORAGE);
      if (raw && raw.length <= MAX_IMPORT * 3) {
        const saved: unknown = JSON.parse(raw);
        if (saved && typeof saved === "object") {
          const s = saved as Record<string, unknown>;
          if (s.profile && typeof s.profile === "object") {
            const p = s.profile as Record<string, unknown>;
            setProfile({ hoursPerWeek: typeof p.hoursPerWeek === "number" && p.hoursPerWeek >= 1 && p.hoursPerWeek <= 80 ? p.hoursPerWeek : 20, yearsExperience: typeof p.yearsExperience === "number" && p.yearsExperience >= 0 && p.yearsExperience <= 60 ? p.yearsExperience : 0, isStudent: typeof p.isStudent === "boolean" ? p.isStudent : true, country: clean(p.country, 80) || "Chile", demonstratedSkills: Array.isArray(p.demonstratedSkills) ? p.demonstratedSkills.filter((v): v is string => typeof v === "string").slice(0, 100) : [] });
          }
          if (Array.isArray(s.imports)) setImportBatches(s.imports.filter((v): v is string => typeof v === "string" && v.length <= MAX_IMPORT).slice(0, 5));
          if (Array.isArray(s.careerOffers)) setCareerOffers(parseLukImport(JSON.stringify(s.careerOffers.slice(0, 100))).opportunities.filter((offer) => offer.provenance !== "illustrative" && offer.status !== "closed"));
          if (Array.isArray(s.evidences)) setEvidences(s.evidences.filter((v) => v && typeof v === "object").slice(0, 100).map((v) => ({ id: clean(v.id, 100), title: clean(v.title, 160), detail: clean(v.detail, 1600), url: clean(v.url, 2000), skillId: clean(v.skillId, 100) })).filter((v) => v.id && v.title));
          if (Array.isArray(s.actions)) setActions(s.actions.filter((v) => v && typeof v === "object").slice(0, 100).map((v) => ({ id: clean(v.id, 100), programId: clean(v.programId, 100), opportunityId: clean(v.opportunityId, 100), title: clean(v.title, 300), owner: clean(v.owner, 160), due: clean(v.due, 10), status: (["pending", "active", "done"].includes(v.status) ? v.status : "pending") as Action["status"] })).filter((v) => v.id && v.title));
        }
      }
    } catch { setStorageIssue("No se pudo recuperar la sesión local. Puedes continuar con la base del estudio."); }
    setReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try { localStorage.setItem(STORAGE, JSON.stringify({ profile, imports: importBatches, actions, evidences, careerOffers })); setStorageIssue(""); }
    catch { setStorageIssue("El navegador no permite guardar más datos. Esta sesión sigue disponible hasta cerrar la página; exporta tu diagnóstico."); }
    });
    return () => { active = false; };
  }, [ready, profile, importBatches, actions, evidences, careerOffers]);

  const imported = useMemo(() => dedupeOpportunities(importBatches.flatMap((text) => parseLukImport(text).opportunities)), [importBatches]);
  const opportunities = useMemo(() => dedupeOpportunities([...careerOffers, ...imported, ...seed]), [careerOffers, imported, seed]);
  const selected = opportunities.find((o) => o.id === selectedId) || opportunities[0];
  const program = programs.find((p) => p.id === programId) || programs[0];
  const filtered = useMemo(() => opportunities.filter((o) => (field === "all" || o.field === field) && (country === "all" || opportunityCountries(o.country).includes(country)) && (kind === "all" || o.kind === kind) && normalize(`${o.title} ${o.company} ${o.description} ${o.skills.map((s) => s.label).join(" ")}`).includes(normalize(search))), [opportunities, field, country, kind, search]);
  const countries = [...new Set(opportunities.flatMap((o) => opportunityCountries(o.country)))].sort();
  const countryCount = countries.filter((value) => normalize(value) !== "por confirmar").length;
  const filteredPrograms = programs.filter((p) => (programField === "all" || p.field === programField) && (programCountry === "all" || p.country === programCountry));
  const skillOptions = [...new Map(opportunities.flatMap((o) => o.skills).map((s) => [s.id, s])).values()].sort((a, b) => a.label.localeCompare(b.label));
  const comparison = useMemo(() => selected && program ? compareCurriculum(program, selected) : [], [program, selected]);
  const fit = useMemo(() => selected ? assessAccess(selected, profile) : null, [selected, profile]);

  function jump(next: Section) { setSection(next); setMessage(""); window.scrollTo({ top: 0, behavior: "auto" }); }
  const selectCareerOpportunity = useCallback((offer: Opportunity) => {
    if (offer.provenance === "illustrative" || offer.status === "closed") return;
    setCareerOffers((previous) => dedupeOpportunities([offer, ...previous]).slice(0, 100));
    setSelectedId(offer.id);
    setMessage("");
  }, []);
  function selectOpportunity(o: Opportunity) { setSelectedId(o.id); setMessage(""); if (window.matchMedia("(max-width: 720px)").matches) requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" })); }
  function importOffers() {
    if (!importText.trim()) { setImportErrors(["Pega un archivo JSON o JSONL antes de importar."]); return; }
    const result = parseLukImport(importText);
    setImportErrors(result.errors); setImportWarnings(result.warnings);
    if (!result.opportunities.length) return;
    if (importBatches.length >= 5 || importBatches.reduce((total, batch) => total + batch.length, 0) + importText.length > MAX_IMPORT * 2) { setImportErrors((prev) => [...prev, "Llegaste al límite de importaciones locales. Exporta el diagnóstico y vacía las importaciones para continuar."]); return; }
    setImportBatches((old) => [...old, importText]); setSelectedId(result.opportunities[0].id);
    setMessage(`${result.opportunities.length} registros válidos incorporados. Las URLs repetidas se muestran una sola vez.`);
  }
  async function upload(file: File | undefined) { if (!file) return; if (file.size > MAX_IMPORT) { setImportErrors(["El archivo supera 2 MB. Importa una muestra más pequeña."]); return; } try { setImportText(await file.text()); setImportErrors([]); setMessage(`Archivo ${file.name} listo para revisar e importar.`); } catch { setImportErrors(["No se pudo leer el archivo. Prueba pegar su contenido."]); } }
  function exportDiagnosis() { saveJson("nexo-diagnostico.json", { schemaVersion: 1, exportedAt: new Date().toISOString(), scope: "Piloto documental; capacidades del perfil autodeclaradas, sin certificación", researchCutoff: "2026-11-01", selectedOpportunity: selected, selectedProgram: program, comparison, profile, access: fit, evidences, actions, importedOpportunities: imported, careerOpportunities: careerOffers }); setMessage("Diagnóstico exportado con fuentes, comparación, perfil y plan de acción."); }
  function addEvidence() { if (!evidenceTitle.trim() || !evidenceDetail.trim()) { setMessage("Completa el título y explica tu aporte antes de guardar la evidencia."); return; } if (evidenceUrl && !externalUrl(evidenceUrl)) { setMessage("El enlace de evidencia debe comenzar con https:// o http://."); return; } setEvidences((old) => [...old, { id: key(), title: evidenceTitle.trim(), detail: evidenceDetail.trim(), url: evidenceUrl.trim(), skillId: evidenceSkill }]); if (evidenceSkill) setProfile((p) => ({ ...p, demonstratedSkills: [...new Set([...p.demonstratedSkills, evidenceSkill])] })); setEvidenceTitle(""); setEvidenceDetail(""); setEvidenceUrl(""); setMessage("Evidencia guardada localmente como autodeclarada. Falta revisión de un docente o supervisor."); }
  function addAction() { if (!actionTitle.trim() || !actionOwner.trim() || !actionDate) { setMessage("Completa acción, responsable y fecha para guardar el plan."); return; } setActions((old) => [...old, { id: key(), programId: program.id, opportunityId: selected.id, title: actionTitle.trim(), owner: actionOwner.trim(), due: actionDate, status: "pending" }]); setActionTitle(""); setMessage("Acción guardada en este navegador, vinculada al programa y oportunidad seleccionados."); }

  return <div className={styles.workspace}>
    <header className={styles.header}>
      <a href="/nexo" className={styles.brand} aria-label="Nexo Talento, inicio"><span className={styles.brandMark}><Link2 size={24} strokeWidth={2.5} /></span><span>Nexo<span className={styles.brandLight}>Talento</span><small>Formación que conecta con oportunidades</small></span></a>
      <div className={styles.headerRight}><span className={styles.pilot}><span />Piloto para el equipo</span><Button variant="outline" onClick={exportDiagnosis} className={styles.exportButton}><Download />Exportar diagnóstico</Button></div>
    </header>
    <div className={styles.appGrid}>
      <aside className={styles.sidebar}>
        <span className={styles.sidebarLabel}>TU ESPACIO</span>
        <nav aria-label="Secciones de Nexo Talento" className={`${styles.nav} ${journeyStyles.workspaceNav}`}>{NAV.map((item) => <button type="button" key={item.id} className={section === item.id ? styles.navActive : ""} onClick={() => jump(item.id)} aria-current={section === item.id ? "page" : undefined}><item.icon size={20} /><span>{item.label}<small>{item.description}</small></span>{section === item.id && <ChevronRight size={16} />}</button>)}</nav>
        <div className={styles.baseCard}><span className={styles.baseIcon}><BookOpen size={18} /></span><strong>Una base con trazabilidad</strong><p>{programs.length} programas de cuatro países. Cada hallazgo conserva su fuente y alcance.</p><span>Revisión: 1 nov 2026</span></div>
        <div className={styles.builtOn}>Construido sobre<br /><strong>TurboTrabajo + Luk</strong><p>Datos personales y acciones guardados sólo en este navegador.</p></div>
      </aside>
      <main className={styles.main}>
        <div className={styles.breadcrumb}>Mi espacio <ChevronRight size={13} /><span>{NAV.find((n) => n.id === section)?.label}</span></div>
        {section !== "journey" && <><div className={styles.pageHeader}><div><div className={styles.eyebrow}>DEL REQUISITO A LA OPORTUNIDAD</div><h1>{section === "opportunities" ? "El trabajo, con todo su contexto." : section === "university" ? "Conecta la malla con tareas reales." : section === "route" ? "Tu experiencia empieza con un paso." : "Convierte ofertas en evidencia."}</h1><p>{section === "opportunities" ? "Explora qué se pide, qué puedes comprobar y dónde hay una vía de entrada." : section === "university" ? "Revisa la formación declarada y convierte cada pregunta en una acción concreta." : section === "route" ? "Relaciona lo que puedes respaldar con condiciones que realmente puedes cumplir." : "Incorpora exportaciones de Luk y conserva la fuente de cada requisito."}</p></div><div className={styles.cornerIcon}>{section === "university" ? <GraduationCap size={30} /> : section === "route" ? <UserRound size={30} /> : section === "import" ? <FileJson size={30} /> : <BriefcaseBusiness size={30} />}</div></div><div className={styles.pipeline} aria-label="Recorrido del producto"><button onClick={() => jump("opportunities")}><span>01</span>Necesidad laboral</button><ArrowRight size={14} /><button onClick={() => jump("university")}><span>02</span>Evidencia formativa</button><ArrowRight size={14} /><button onClick={() => jump("route")}><span>03</span>Acceso a experiencia</button></div></>}
        <div aria-live="polite" className={styles.liveMessages}>{message && <div className={styles.successMessage}><Check size={16} /><span>{message}</span><button onClick={() => setMessage("")} aria-label="Cerrar mensaje"><X size={15} /></button></div>}{storageIssue && <p className={styles.errorMessage}>{storageIssue}</p>}</div>
        {selected?.provenance === "illustrative" && section !== "import" && section !== "journey" && <div className={styles.syntheticNotice}><FileJson size={15} /><span>La oportunidad seleccionada es un ejemplo ficticio para probar el recorrido. No es una vacante real.</span></div>}
        <div hidden={section !== "journey"}><CareerJourney profile={profile} workspaceReady={ready} onProfileChange={setProfile} onSelectOpportunity={selectCareerOpportunity} onCompareCurriculum={() => jump("university")} onViewRoute={() => jump("route")} /></div>

        {section === "opportunities" && <>
          <div className={styles.summaryLine}><span><strong>{opportunities.length}</strong> ofertas y vías documentadas</span><span><strong>{countryCount}</strong> países en las fuentes</span><span><strong>{imported.length}</strong> registros importados en esta sesión</span></div>
          <div className={styles.filterBar}><label className={styles.search}><Search size={18} /><Input aria-label="Buscar oportunidades por cargo, empresa o habilidad" placeholder="Cargo, empresa o habilidad…" value={search} onChange={(e) => { setSearch(e.target.value); setVisibleCount(8); }} /></label><SelectField id="filter-field" label="Área" value={field} onChange={(v) => { setField(v); setVisibleCount(8); }}><option value="all">Todas las áreas</option>{Object.entries(FIELDS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</SelectField><SelectField id="filter-kind" label="Tipo de vía" value={kind} onChange={(v) => { setKind(v); setVisibleCount(8); }}><option value="all">Todas las vías</option>{Object.entries(KINDS).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</SelectField><SelectField id="filter-country" label="País" value={country} onChange={(v) => { setCountry(v); setVisibleCount(8); }}><option value="all">Todos los países</option>{countries.map((c) => <option key={c}>{c}</option>)}</SelectField></div>
          <div className={styles.opportunityGrid}>
            <section aria-label="Resultados de oportunidades" className={styles.results}><div className={styles.listHeading}><span>{filtered.length} resultados</span>{(search || field !== "all" || kind !== "all" || country !== "all") && <button onClick={() => { setSearch(""); setField("all"); setKind("all"); setCountry("all"); }}>Limpiar filtros</button>}</div>
              {filtered.length ? filtered.slice(0, visibleCount).map((o) => <button type="button" key={o.id} className={`${styles.opportunityCard} ${selected?.id === o.id ? styles.selectedCard : ""}`} onClick={() => selectOpportunity(o)} aria-pressed={selected?.id === o.id}><div className={styles.cardTop}><span className={styles.companyAvatar}>{o.company.slice(0, 2).toUpperCase()}</span><span className={styles.companyName}>{o.company}<small><MapPin size={11} />{o.country || o.location}</small></span><ChevronRight size={18} /></div><h2>{o.title}</h2><div className={styles.pills}><Badge variant="secondary">{KINDS[o.kind]}</Badge><span className={`${styles.status} ${o.status === "closed" ? styles.historical : ""}`}>{STATUSES[o.status]}</span>{o.provenance === "illustrative" && <Badge variant="outline">Ejemplo ficticio</Badge>}</div><div className={styles.skillPreview}>{o.skills.slice(0, 3).map((s) => <span key={s.id}>{s.label}</span>)}{!o.skills.length && <span>Requisitos por revisar</span>}</div></button>) : <Empty title="No hay resultados con estos filtros">Prueba otra combinación. Una búsqueda vacía no demuestra ausencia de oportunidades en el mercado.</Empty>}
              {filtered.length > visibleCount && <Button variant="outline" onClick={() => setVisibleCount((n) => n + 8)}>Ver más resultados</Button>}
            </section>
            {selected && <section ref={detailRef} className={styles.detailPanel} aria-label="Detalle de oportunidad seleccionada"><div className={styles.detailHeader}><div><span className={styles.eyebrow}>OPORTUNIDAD SELECCIONADA</span><h2>{selected.title}</h2><p>{selected.company}</p></div><span className={styles.detailIcon}><BriefcaseBusiness size={23} /></span></div><div className={styles.detailMeta}><span><MapPin size={14} />{selected.location}</span><span>Observada: {dateLabel(selected.observedAt)}</span></div><Note>{selected.status === "closed" ? "Referencia histórica: sirve para estudiar requisitos, no para recomendar una postulación vigente." : selected.status === "program" || selected.kind === "curricular" ? "Es una vía de formación o programa institucional. No representa una vacante abierta para cualquier persona." : "La fuente fue observada en una fecha concreta. Confirma disponibilidad y condiciones antes de postular."}</Note>
              <div className={styles.detailSection}><h3>Capacidades encontradas</h3>{selected.skills.length ? <div className={styles.requirements}>{selected.skills.map((s) => <details key={s.id}><summary><span>{s.label}</span><span className={styles.requirementLevel}>{LEVELS[s.level]}</span></summary><p>{s.evidence || "Mención en la descripción; necesita validación."}</p></details>)}</div> : <p className={styles.muted}>No se identificaron capacidades con el vocabulario actual. Revisa la descripción original.</p>}</div>
              <div className={styles.conditions}><div><span>Experiencia previa</span><strong>{selected.experienceMinYears === null ? "No determinada" : selected.experienceMinYears === 0 && selected.experienceIsRequired === false ? "Sin experiencia previa requerida" : `${selected.experienceStrictMinimum ? "Más de " : ""}${selected.experienceMinYears} años${selected.experienceIsRequired === false ? " · deseable" : selected.experienceIsRequired ? " · requisito" : " · por confirmar"}`}</strong></div><div><span>Jornada</span><strong>{selected.hoursPerWeek !== null ? `${selected.hoursPerWeek} horas semanales` : "Horas sin confirmar"}</strong></div><div><span>Remuneración</span><p>{selected.remuneration || "No publicada"}</p></div><div><span>Supervisión</span><p>{selected.supervision || "No declarada"}</p></div></div>
              <details className={styles.sourceDetails}><summary>Descripción, condiciones y límites</summary><p>{selected.description}</p><p>{selected.scheduleText}</p><ul>{selected.limits.map((l, i) => <li key={i}>{l}</li>)}</ul></details><div className={styles.detailActions}><Button onClick={() => jump("university")}><GraduationCap />Comparar con una malla</Button><Button variant="secondary" onClick={() => jump("route")}>Ver mi compatibilidad<ArrowRight /></Button></div><SourceLink url={selected.sourceUrl} /></section>}
          </div>
        </>}

        {section === "university" && program && selected && <>
          <div className={styles.selectionBanner}><BriefcaseBusiness size={19} /><div><span>Estamos comparando con</span><strong>{selected.title} · {selected.company}</strong></div><button onClick={() => jump("opportunities")}>Cambiar oportunidad<ArrowRight size={14} /></button></div>
          <div className={styles.programFilters}><SelectField id="program-field" label="Área de formación" value={programField} onChange={(v) => { setProgramField(v); const first = programs.find((p) => (v === "all" || p.field === v) && (programCountry === "all" || p.country === programCountry)); if (first) setProgramId(first.id); }}><option value="all">Las cuatro áreas</option>{Object.entries(FIELDS).filter(([id]) => id !== "general").map(([id, name]) => <option key={id} value={id}>{name}</option>)}</SelectField><SelectField id="program-country" label="País del programa" value={programCountry} onChange={(v) => { setProgramCountry(v); const first = programs.find((p) => (programField === "all" || p.field === programField) && (v === "all" || p.country === v)); if (first) setProgramId(first.id); }}><option value="all">Los cuatro países</option>{[...new Set(programs.map((p) => p.country))].map((c) => <option key={c}>{c}</option>)}</SelectField><SelectField id="program-id" label="Programa e institución" value={programId} onChange={setProgramId}>{filteredPrograms.map((p) => <option key={p.id} value={p.id}>{p.institution} · {p.name}</option>)}</SelectField></div>
          <div className={styles.programHeader}><span className={styles.programIcon}><GraduationCap size={30} /></span><div><h2>{program.institution}</h2><p>{program.name}</p><small>{program.version}</small></div><SourceLink url={program.sourceUrl}>Consultar programa</SourceLink></div>
          {selected.field !== "general" && selected.field !== program.field && <div className={styles.syntheticNotice}><BookOpen size={15} /><span>Programa y oportunidad pertenecen a áreas diferentes. Revisa su pertinencia antes de interpretar las coincidencias.</span></div>}
          <div className={styles.comparisonLayout}><section><div className={styles.sectionHeading}><h2>Relación entre requisito y formación</h2><span>{comparison.length} capacidades a revisar</span></div><Note>La comparación encuentra evidencia documental. La presencia de una asignatura no acredita dominio del estudiante; una coincidencia pendiente no significa que la universidad no lo enseñe.</Note>{comparison.length ? <div className={styles.comparisonList}>{comparison.map((match) => <Card key={match.skill.id} className={styles.comparisonCard}><CardContent><div className={styles.matchHeader}><h3>{match.skill.label}</h3><span className={`${styles.coverage} ${match.status === "unverified" ? styles.coveragePending : ""}`}>{match.status === "declared" ? "Contenido identificado" : match.status === "elective" ? "Depende del itinerario" : "Revisión pendiente"}</span></div><p className={styles.matchNote}>{match.note}</p>{match.evidence.map((e, i) => <div className={styles.evidenceRow} key={`${e.competency}-${i}`}><BookOpen size={16} /><div><strong>{e.course || e.competency}</strong><p>{e.competency} · {e.location}</p><SourceLink url={e.sourceUrl}>Ver evidencia</SourceLink></div></div>)}{!match.evidence.length && <div className={styles.pendingAction}>Siguiente paso: revisar programa de asignatura y evaluación con la carrera.</div>}</CardContent></Card>)}</div> : <Empty title="Falta identificar requisitos comparables">Selecciona otra oportunidad o importa una descripción con tareas y capacidades explícitas.</Empty>}</section>
          <aside className={styles.actionPanel}><span className={styles.eyebrow}>PASAR A LA ACCIÓN</span><h2>Plan de mejora</h2><p className={styles.muted}>Puede ser una mejora formativa o una nueva oportunidad de práctica.</p><form onSubmit={(e) => { e.preventDefault(); addAction(); }} className={styles.formStack}><label className={styles.field} htmlFor="action-title"><span>Acción concreta</span><Textarea id="action-title" placeholder="Revisar la evaluación aplicada de datos…" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} maxLength={300} required /></label><label className={styles.field} htmlFor="action-owner"><span>Responsable</span><Input id="action-owner" placeholder="Dirección de carrera" value={actionOwner} onChange={(e) => setActionOwner(e.target.value)} maxLength={160} required /></label><label className={styles.field} htmlFor="action-date"><span>Fecha de revisión</span><Input id="action-date" type="date" value={actionDate} onChange={(e) => setActionDate(e.target.value)} required /></label><Button type="submit"><Plus />Guardar acción</Button></form><div className={styles.actionList}>{actions.filter((a) => a.programId === program.id).map((a) => <div className={styles.savedAction} key={a.id}><strong>{a.title}</strong><p>{a.owner} · {dateLabel(a.due)}</p><div className={styles.actionControls}><select value={a.status} aria-label={`Estado de ${a.title}`} onChange={(e) => setActions((old) => old.map((row) => row.id === a.id ? { ...row, status: e.target.value as Action["status"] } : row))}><option value="pending">Pendiente</option><option value="active">En curso</option><option value="done">Realizada</option></select><button onClick={() => setActions((old) => old.filter((row) => row.id !== a.id))} aria-label={`Eliminar acción ${a.title}`}><X size={15} /></button></div></div>)}</div><small className={styles.localNote}>Plan local del equipo. No envía notificaciones a responsables.</small></aside></div>
        </>}

        {section === "route" && selected && fit && <>
          <div className={styles.routeGrid}><section className={styles.profilePanel}><div className={styles.panelTitle}><span className={styles.profileIcon}><UserRound size={22} /></span><div><h2>Mi punto de partida</h2><p>Perfil local y autodeclarado</p></div></div><div className={styles.profileFields}><label className={styles.field} htmlFor="available-hours"><span>Horas disponibles por semana</span><Input id="available-hours" type="number" min={1} max={80} value={profile.hoursPerWeek} onChange={(e) => setProfile((p) => ({ ...p, hoursPerWeek: Math.max(1, Math.min(80, Number(e.target.value) || 1)) }))} /></label><label className={styles.field} htmlFor="experience-years"><span>Años de experiencia</span><Input id="experience-years" type="number" min={0} max={60} step={0.5} value={profile.yearsExperience} onChange={(e) => setProfile((p) => ({ ...p, yearsExperience: Math.max(0, Math.min(60, Number(e.target.value) || 0)) }))} /></label><SelectField id="profile-country" label="País donde busco" value={profile.country} onChange={(v) => setProfile((p) => ({ ...p, country: v }))}>{[...new Set(["Chile", "Brasil", "México", "Colombia", "Perú", ...countries])].map((c) => <option key={c}>{c}</option>)}</SelectField><SelectField id="student-status" label="Situación académica" value={profile.isStudent ? "student" : "graduate"} onChange={(v) => setProfile((p) => ({ ...p, isStudent: v === "student" }))}><option value="student">Estudiante con matrícula</option><option value="graduate">Egresado / sin matrícula</option></SelectField></div><h3 className={styles.subheading}>Capacidades que puedo respaldar</h3><p className={styles.muted}>Marca sólo las que puedes explicar con un trabajo o experiencia. Requieren revisión.</p><div className={styles.skillChecks}>{skillOptions.map((s) => <label key={s.id}><input type="checkbox" checked={profile.demonstratedSkills.includes(s.id)} onChange={(e) => setProfile((p) => ({ ...p, demonstratedSkills: e.target.checked ? [...p.demonstratedSkills, s.id] : p.demonstratedSkills.filter((id) => id !== s.id) }))} /><span>{s.label}</span></label>)}</div></section>
          <section className={styles.fitPanel}><span className={styles.eyebrow}>TU PERFIL + ESTA OPORTUNIDAD</span><h2>{selected.title}</h2><p className={styles.muted}>{selected.company} · {selected.country}</p><button className={styles.inlineButton} onClick={() => jump("opportunities")}>Elegir otra oportunidad<ArrowRight size={14} /></button><FitSummary fit={fit} /><Note>Una incompatibilidad de horario o matrícula es una condición de acceso. Las habilidades marcadas aquí no están certificadas.</Note></section></div>
          <section className={styles.evidenceSection}><div className={styles.sectionHeading}><div><h2>Mi carpeta de evidencias</h2><p>Proyectos académicos, experiencias y trabajos que puedas explicar.</p></div><span>{evidences.length} registros locales</span></div><div className={styles.evidenceGrid}><form onSubmit={(e) => { e.preventDefault(); addEvidence(); }} className={styles.evidenceForm}><label className={styles.field} htmlFor="evidence-title"><span>Nombre del trabajo</span><Input id="evidence-title" value={evidenceTitle} onChange={(e) => setEvidenceTitle(e.target.value)} placeholder="Análisis de datos de mi proyecto final" maxLength={160} required /></label><label className={styles.field} htmlFor="evidence-detail"><span>Qué hiciste y qué resultado puedes mostrar</span><Textarea id="evidence-detail" value={evidenceDetail} onChange={(e) => setEvidenceDetail(e.target.value)} placeholder="Mi aporte fue… Lo revisó… El resultado fue…" maxLength={1600} required /></label><label className={styles.field} htmlFor="evidence-url"><span>Enlace autorizado (opcional)</span><Input id="evidence-url" type="url" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://…" maxLength={2000} /></label><SelectField id="evidence-skill" label="Capacidad relacionada" value={evidenceSkill} onChange={setEvidenceSkill}><option value="">Seleccionar después</option>{skillOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</SelectField><Button type="submit"><Plus />Guardar evidencia</Button></form><div className={styles.evidenceItems}>{evidences.length ? evidences.map((ev) => <Card key={ev.id} className={styles.evidenceCard}><CardContent><div className={styles.matchHeader}><span className={styles.eyebrow}>AUTODECLARADA · POR REVISAR</span><button onClick={() => setEvidences((old) => old.filter((e) => e.id !== ev.id))} aria-label={`Eliminar evidencia ${ev.title}`}><X size={16} /></button></div><h3>{ev.title}</h3><p>{ev.detail}</p>{ev.skillId && <Badge variant="secondary">{skillOptions.find((s) => s.id === ev.skillId)?.label || ev.skillId}</Badge>}{ev.url && <SourceLink url={ev.url}>Consultar trabajo</SourceLink>}</CardContent></Card>) : <Empty title="Tu primera evidencia cuenta">Un proyecto puede mostrar capacidades relevantes. Describe tu aporte y conserva su contexto.</Empty>}</div></div></section>
        </>}

        {section === "import" && <>
          <div className={styles.importGrid}><section className={styles.importPanel}><div className={styles.panelTitle}><span className={styles.profileIcon}><Upload size={22} /></span><div><h2>Importar ofertas de Luk</h2><p>JSON, JSONL o respuesta del asistente</p></div></div><p className={styles.muted}>La importación conserva la fuente y extrae requisitos explícitos. Revisa los resultados antes de usarlos como diagnóstico.</p><div className={styles.importTools}><label className={styles.fileButton}><Upload size={16} />Elegir archivo<input type="file" accept=".json,.jsonl,application/json,text/plain" aria-label="Elegir archivo de ofertas Luk" onChange={(e) => upload(e.target.files?.[0])} /></label><a href="/examples/luk-ofertas-demo.jsonl" download>Descargar ejemplo ficticio<Download size={14} /></a></div><label className={styles.field} htmlFor="luk-import"><span>Contenido de la exportación</span><Textarea id="luk-import" className={styles.jsonInput} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder={'{"title":"…","company":"…","url":"https://…","description":"…"}'} spellCheck={false} /></label><div className={styles.importActions}><Button onClick={importOffers}><FileJson />Validar e importar</Button><span>Hasta 2 MB por archivo</span></div>{importErrors.length > 0 && <div role="alert" className={styles.importErrors}><strong>Revisa estos registros</strong><ul>{importErrors.map((error, i) => <li key={i}>{error}</li>)}</ul></div>}{importWarnings.length > 0 && <div className={styles.importWarnings}><strong>Condiciones de la importación</strong><ul>{importWarnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul></div>}<div className={styles.importStatus}><span><strong>{imported.length}</strong> registros válidos en {importBatches.length} importaciones</span>{imported.length > 0 && <><button onClick={() => jump("opportunities")}>Ver oportunidades<ArrowRight size={14} /></button><button onClick={() => { setImportBatches([]); setMessage("Importaciones locales eliminadas. La base documental se mantiene."); }}>Vaciar importaciones</button></>}</div></section>
          <aside className={styles.extractPanel}><div className={styles.panelTitle}><Sparkles size={20} /><h2>Leer requisitos de una oferta</h2></div><p className={styles.muted}>Prueba una descripción y revisa qué fragmentos respaldan cada hallazgo.</p><label className={styles.field} htmlFor="description-analysis"><span>Descripción laboral</span><Textarea id="description-analysis" value={analysisText} onChange={(e) => setAnalysisText(e.target.value)} maxLength={20000} /></label><Button variant="secondary" onClick={() => setAnalysis(extractRequirements(analysisText))}>Analizar descripción<ArrowRight /></Button>{analysis && <div className={styles.extractionResult} aria-live="polite"><dl><div><dt>Horas semanales</dt><dd>{analysis.hoursPerWeek ?? "No determinadas"}</dd></div><div><dt>Experiencia mínima</dt><dd>{analysis.experienceMinYears === null ? "No determinada" : `${analysis.experienceMinYears} años`}</dd></div><div><dt>Proyectos académicos</dt><dd>{analysis.acceptsProjects === true ? "Aceptados en el texto" : analysis.acceptsProjects === false ? "No aceptados en el texto" : "No determinado"}</dd></div></dl>{analysis.skills.map((s) => <div className={styles.extractedSkill} key={s.id}><div><strong>{s.label}</strong><Badge variant="secondary">{LEVELS[s.level]}</Badge></div><p>{s.evidence}</p></div>)}{!analysis.skills.length && <p>No se encontraron capacidades con el vocabulario actual. El texto requiere revisión.</p>}</div>}</aside></div><Note>La lectura usa reglas transparentes y un vocabulario inicial. No realiza una evaluación de la persona ni interpreta “jornada parcial” como una cantidad fija de horas. Los ejemplos descargables son ficticios.</Note>
        </>}
        <footer className={styles.footer}><span><CheckCheck size={14} />Fuentes visibles · decisiones explicables</span><p>Piloto documental · fuentes del estudio revisadas el 1 nov 2026. Las importaciones conservan su propia fecha.</p></footer>
      </main>
    </div>
  </div>;
}
