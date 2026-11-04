"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, BriefcaseBusiness, Check, ChevronDown, CircleAlert, Clock3, Compass, GraduationCap, LoaderCircle, MapPin, Search, ShieldCheck, Sparkles, Target, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assessAccess, getResearchOpportunities, parseLukImport } from "@/lib/nexo/engine";
import { getCareerSeed, getLearningCourses, getSalaryGroups, getSkillSignals, recommendLearning, uniqueRealOpportunities, connectsToObjective, type LearningCourse } from "@/lib/nexo/market";
import type { Opportunity, StudentProfile } from "@/lib/nexo/types";
import styles from "./career-journey.module.css";

interface CareerJourneyProps {
  profile: StudentProfile;
  documentedSkillIds: string[];
  workspaceReady: boolean;
  routeObjectiveId: string;
  onProfileChange: (profile: StudentProfile) => void;
  onSelectOpportunity: (opportunity: Opportunity) => void;
  onCompareCurriculum: () => void;
  onViewRoute: () => void;
}

type Coverage = { page: number; pageSize: number; totalPages: number | null; hasMore: boolean | null; limitReached: boolean; received: number; unique: number; matched: number; duplicates: number; omitted: number; locationFilter: "none" | "text_on_page" };
type Capture = { date: string; query: string; location: string; source: string; reviewed: boolean; cacheHit: boolean; coverage?: Coverage };
type CareerSession = { query: string; location: string; offers: Opportunity[]; capture: Capture; selectedId: string; warnings: string[] };
type CourseFilter = "matching" | "ai" | "all";
type DetailTab = "skills" | "learning" | "experience";
const DETAIL_TABS: { id: DetailTab; label: string }[] = [{ id: "skills", label: "Requisitos" }, { id: "learning", label: "Formación" }, { id: "experience", label: "Acceso y experiencia" }];
const SESSION_STORAGE = "nexo-career-journey-v1";
const MAX_SESSION_BYTES = 2 * 1024 * 1024;
const AI_SKILLS = ["ai", "machine-learning", "mlops", "automation"];
const COURSE_STATES: Record<LearningCourse["enrollmentStatus"], string> = { open: "Inscripción observada abierta; confirmar disponibilidad", ongoing: "Acceso continuo según la fuente", unverified: "Inscripción por confirmar", closed: "Inscripción cerrada" };

function safeUrl(value: string): string | null {
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
function readCoverage(value: unknown): Coverage | undefined {
  if (!value || typeof value !== "object") return undefined;
  const data = value as Record<string, unknown>;
  const count = (key: string) => typeof data[key] === "number" && Number.isFinite(data[key]) && data[key] >= 0 ? data[key] as number : 0;
  if (!count("page") || !count("pageSize")) return undefined;
  return { page: count("page"), pageSize: count("pageSize"), totalPages: count("totalPages") || null, hasMore: typeof data.hasMore === "boolean" ? data.hasMore : null, limitReached: data.limitReached === true, received: count("received"), unique: count("unique"), matched: count("matched"), duplicates: count("duplicates"), omitted: count("omitted"), locationFilter: data.locationFilter === "text_on_page" ? "text_on_page" : "none" };
}
function restoreCareerSession(raw: string): CareerSession | null {
  if (new TextEncoder().encode(raw).byteLength > MAX_SESSION_BYTES) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const stored = parsed as Record<string, unknown>;
    if (stored.version !== 1 || !Array.isArray(stored.offers) || !stored.capture || typeof stored.capture !== "object") return null;
    const captured = stored.capture as Record<string, unknown>;
    if (typeof captured.reviewed !== "boolean") return null;
    const string = (value: unknown, limit: number) => typeof value === "string" ? value.slice(0, limit) : "";
    const offers = uniqueRealOpportunities(parseLukImport(JSON.stringify(stored.offers.slice(0, 100))).opportunities).map((offer) => ({ ...offer, limits: [...new Set(offer.limits)] }));
    if (stored.offers.length && !offers.length) return null;
    const selectedId = string(stored.selectedId, 200);
    const selectedUrl = safeUrl(string(stored.selectedSourceUrl, 4000));
    const selected = offers.find((offer) => offer.id === selectedId) || offers.find((offer) => selectedUrl && safeUrl(offer.sourceUrl) === selectedUrl) || offers[0];
    const date = string(captured.date, 80);
    return {
      query: string(stored.query, 120), location: string(stored.location, 100), offers, selectedId: selected?.id || "",
      capture: { date: date && Number.isFinite(Date.parse(date)) ? date : "", query: string(captured.query, 120), location: string(captured.location, 100), source: string(captured.source, 80).trim() || "Fuente no indicada", reviewed: captured.reviewed, cacheHit: captured.cacheHit === true, coverage: readCoverage(captured.coverage) },
      warnings: Array.isArray(stored.warnings) ? stored.warnings.filter((warning): warning is string => typeof warning === "string").map((warning) => warning.slice(0, 500)).slice(0, 10) : [],
    };
  } catch { return null; }
}
function dateLabel(value: string): string {
  if (!value) return "Fecha por confirmar";
  const date = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isNaN(date.valueOf()) ? "Fecha por confirmar" : date.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
}
function waitLabel(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes ? `${minutes} ${minutes === 1 ? "minuto" : "minutos"}${remainder ? ` y ${remainder} ${remainder === 1 ? "segundo" : "segundos"}` : ""}` : `${seconds} ${seconds === 1 ? "segundo" : "segundos"}`;
}
function Source({ url, label = "Ver publicación" }: { url: string; label?: string }) {
  const href = safeUrl(url);
  return href ? <a href={href} target="_blank" rel="noopener noreferrer" className={styles.source}>{label}<ArrowUpRight size={14} aria-hidden="true" /></a> : <span className={styles.disabledSource}>Fuente por confirmar</span>;
}
function experienceLabel(offer: Opportunity): string {
  if ((offer.experienceRequirements?.length || 0) > 1) return "Experiencia por función: revisar requisitos";
  if (offer.experienceMinYears === 0 && offer.experienceIsRequired === false) return "Sin experiencia previa requerida";
  if (offer.experienceMinYears === null) return "Experiencia por confirmar";
  const duration = offer.experienceMinYears === 0.5 ? "6 meses" : `${offer.experienceMinYears} ${offer.experienceMinYears === 1 ? "año" : "años"}`;
  return `${offer.experienceStrictMinimum ? "Más de " : ""}${duration}${offer.experienceIsRequired === false ? " deseables" : offer.experienceIsRequired ? " requeridos" : " por confirmar"}`;
}
function countryMatches(country: string, target: string): boolean { return country.split("/").some((value) => value.trim().localeCompare(target.trim(), "es", { sensitivity: "base" }) === 0); }
function salaryRange(min: number, max: number): string {
  const format = (number: number) => number.toLocaleString("es-CL", { maximumFractionDigits: 2 });
  return min === max ? format(min) : `${format(min)}–${format(max)}`;
}
function SectionHeading({ number, title, description, count }: { number: string; title: string; description: string; count?: string }) {
  return <div className={styles.sectionHeader}><div className={styles.sectionHeading}><span className={styles.sectionNumber}>{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>{count && <span className={styles.count}>{count}</span>}</div>;
}

export function CareerJourney({ profile, documentedSkillIds, workspaceReady, routeObjectiveId, onProfileChange, onSelectOpportunity, onCompareCurriculum, onViewRoute }: CareerJourneyProps) {
  const [seed] = useState(() => uniqueRealOpportunities(getCareerSeed()));
  const [courses] = useState(() => getLearningCourses());
  const [experienceSeed] = useState(() => uniqueRealOpportunities(getResearchOpportunities()));
  const [offers, setOffers] = useState<Opportunity[]>(seed);
  const [query, setQuery] = useState("Analista de datos");
  const [location, setLocation] = useState("");
  const [capture, setCapture] = useState<Capture>(() => ({ date: seed.map((offer) => offer.observedAt).sort().at(-1) || "", query: "Muestra inicial de datos y tecnología", location: "", source: "Selección documental", reviewed: true, cacheHit: false }));
  const [selectedId, setSelectedId] = useState(seed[0]?.id || "");
  const [activeSkillId, setActiveSkillId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryUntil, setRetryUntil] = useState(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [captureBlocked, setCaptureBlocked] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [storageIssue, setStorageIssue] = useState("");
  const [offerCount, setOfferCount] = useState(3);
  const [courseCount, setCourseCount] = useState(3);
  const [courseFilter, setCourseFilter] = useState<CourseFilter>("matching");
  const [showAllSkills, setShowAllSkills] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>("skills");
  const requestRef = useRef<AbortController | null>(null);
  const queryInputRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const jobsRef = useRef<HTMLElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const raw = localStorage.getItem(SESSION_STORAGE);
        const restored = raw ? restoreCareerSession(raw) : null;
        if (restored) {
          setQuery(restored.query); setLocation(restored.location); setOffers(restored.offers); setCapture(restored.capture);
          setSelectedId(restored.selectedId); setWarnings(restored.warnings); setHasSearched(!restored.capture.reviewed); setRestoredFromStorage(true);
          setOfferCount(Math.max(3, restored.offers.findIndex((offer) => offer.id === restored.selectedId) + 1));
        }
      } catch { setStorageIssue("No se pudo recuperar la búsqueda guardada. Puedes realizar una nueva consulta."); }
      setSessionReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!sessionReady) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const snapshot = JSON.stringify({ version: 1, query, location, offers, capture, selectedId, selectedSourceUrl: offers.find((offer) => offer.id === selectedId)?.sourceUrl || "", warnings });
        if (new TextEncoder().encode(snapshot).byteLength > MAX_SESSION_BYTES) throw new Error("Session too large");
        localStorage.setItem(SESSION_STORAGE, snapshot);
        setStorageIssue("");
      } catch { setStorageIssue("Esta búsqueda sigue disponible en la pestaña, pero el navegador no permite guardarla para la próxima visita."); }
    });
    return () => { active = false; };
  }, [sessionReady, query, location, offers, capture, selectedId, warnings]);
  useEffect(() => () => requestRef.current?.abort(), []);
  useEffect(() => {
    if (!retryUntil) return;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((retryUntil - Date.now()) / 1000));
      setRetrySeconds(remaining);
      if (!remaining) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [retryUntil]);

  const selected = offers.find((offer) => offer.id === selectedId) || offers[0];
  const isRouteObjective = selected?.id === routeObjectiveId;
  const marketSignals = useMemo(() => getSkillSignals(offers), [offers]);
  const signals = useMemo(() => marketSignals.filter((signal) => selected?.skills.some((skill) => skill.id === signal.id)), [marketSignals, selected]);
  const groups = useMemo(() => getSalaryGroups(offers), [offers]);
  const activeSkill = signals.find((skill) => skill.id === activeSkillId) || signals[0];
  const activeRequirement = selected?.skills.find((skill) => skill.id === activeSkill?.id);
  const pendingSkills = useMemo(() => signals.filter((skill) => !profile.demonstratedSkills.includes(skill.id)), [signals, profile.demonstratedSkills]);
  const undocumentedSkills = signals.filter((skill) => !documentedSkillIds.includes(skill.id));
  const skillLabels = new Map(signals.map((signal) => [signal.id, signal.label]));
  const matchingCourses = useMemo(() => recommendLearning(pendingSkills.map((skill) => skill.id), courses), [pendingSkills, courses]);
  const visibleCourses = courseFilter === "matching" ? matchingCourses : courses.filter((course) => course.enrollmentStatus !== "closed" && (courseFilter !== "ai" || course.skills.some((skill) => AI_SKILLS.includes(skill)))).map((course) => ({ course, matchedSkills: course.skills.filter((skill) => pendingSkills.some((pending) => pending.id === skill)) }));
  const relevantExperiences = useMemo(() => uniqueRealOpportunities([...offers, ...experienceSeed])
    .filter((offer) => selected && connectsToObjective(offer, selected) && (offer.kind === "internship" || offer.kind === "entry_job" || offer.acceptsProjects === true || (offer.experienceMinYears === 0 && offer.experienceIsRequired === false)))
    .map((offer) => ({ offer, access: assessAccess(offer, profile) }))
    .sort((a, b) => Number(countryMatches(b.offer.country, profile.country)) - Number(countryMatches(a.offer.country, profile.country)) || a.access.barriers.length - b.access.barriers.length), [offers, experienceSeed, selected, profile]);

  function chooseOpportunity(offer: Opportunity) {
    setSelectedId(offer.id); setDetailTab("skills");
    onSelectOpportunity(offer);
    if (!offer.skills.some((skill) => skill.id === activeSkillId)) setActiveSkillId(offer.skills[0]?.id || "");
    if (window.matchMedia("(max-width: 850px)").matches) requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  }
  function returnToResults() {
    const target = selectedButtonRef.current || jobsRef.current;
    target?.focus({ preventScroll: true });
    target?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }
  function toggleSkill(id: string) {
    onProfileChange({ ...profile, demonstratedSkills: profile.demonstratedSkills.includes(id) ? profile.demonstratedSkills.filter((skill) => skill !== id) : [...new Set([...profile.demonstratedSkills, id])] });
  }
  function openComparison() { if (selected) onSelectOpportunity(selected); onCompareCurriculum(); }
  function openProfile(offer = selected) { if (offer) onSelectOpportunity(offer); onViewRoute(); }
  async function searchOffers(event?: FormEvent) {
    event?.preventDefault();
    if (captureBlocked || retryUntil > Date.now() || loading) return;
    if (query.trim().length < 2) { setError("Escribe un cargo o área de al menos dos caracteres para buscar."); queryInputRef.current?.focus(); return; }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    const requestedQuery = query.trim();
    const requestedLocation = location.trim();
    setLoading(true); setError("");
    const timeout = setTimeout(() => controller.abort(), 95000);
    try {
      const response = await fetch("/api/nexo/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: requestedQuery, location: requestedLocation }), signal: controller.signal });
      const payload: unknown = await response.json();
      if (!payload || typeof payload !== "object") throw new Error("La búsqueda no devolvió una respuesta válida. Intenta nuevamente.");
      const result = payload as Record<string, unknown>;
      if (!response.ok) {
        const wait = typeof result.retryAfterSeconds === "number" && Number.isFinite(result.retryAfterSeconds) && result.retryAfterSeconds > 0 ? Math.ceil(result.retryAfterSeconds) : 0;
        if (wait) { setRetryUntil(Date.now() + wait * 1000); setRetrySeconds(wait); }
        if (result.code === "ACCESS_BLOCKED") setCaptureBlocked(true);
        throw new Error(typeof result.error === "string" ? result.error.slice(0, 500) : "No pudimos consultar las publicaciones ahora. Intenta nuevamente.");
      }
      if (!Array.isArray(result.opportunities)) throw new Error("No pudimos interpretar las ofertas recibidas. Puedes reintentar la búsqueda.");
      const parsed = parseLukImport(JSON.stringify(result.opportunities.slice(0, 100)));
      const realOffers = uniqueRealOpportunities(parsed.opportunities);
      const receivedWarnings = Array.isArray(result.warnings) ? result.warnings.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 500)).slice(0, 10) : [];
      setOffers(realOffers); setSelectedId(realOffers[0]?.id || ""); setDetailTab("skills"); setActiveSkillId(""); setOfferCount(3); setCourseCount(3); setHasSearched(true); setRestoredFromStorage(false);
      setCapture({ date: typeof result.capturedAt === "string" ? result.capturedAt : "", query: requestedQuery, location: requestedLocation, source: typeof result.source === "string" && result.source.trim() ? result.source.trim().slice(0, 80) : "Fuente no indicada", reviewed: false, cacheHit: result.cacheHit === true, coverage: readCoverage(result.coverage) });
      setWarnings([...receivedWarnings, ...(parsed.errors.length ? ["Algunos registros no tenían información suficiente para incorporarse al recorrido."] : [])]);
    } catch (failure) {
      if (requestRef.current === controller) setError(controller.signal.aborted ? "La consulta está tardando más de lo esperado. Puedes reintentar; conservamos la muestra anterior." : failure instanceof Error ? failure.message : "No se pudo completar la consulta. Puedes reintentar.");
    } finally { clearTimeout(timeout); if (requestRef.current === controller) setLoading(false); }
  }

  return <div className={styles.journey}>
    <section className={styles.hero} aria-labelledby="career-title">
      <div className={styles.eyebrow}><Compass size={15} />TU PRÓXIMO PASO</div>
      <h1 id="career-title">Elige un objetivo. <em>Revisa tu siguiente paso.</em></h1>
      <p>Compara requisitos, formación y oportunidades de experiencia con sus fuentes y condiciones.</p>
      <form className={styles.searchForm} onSubmit={searchOffers}>
        <label htmlFor="career-query"><span>¿En qué te gustaría trabajar?</span><div><Search size={17} aria-hidden="true" /><Input ref={queryInputRef} id="career-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Analista de datos, auditor, desarrollador…" maxLength={120} autoComplete="off" /></div></label>
        <label htmlFor="career-location"><span>Ubicación <span style={{ fontWeight: 400 }}>(opcional)</span></span><div><MapPin size={17} aria-hidden="true" /><Input id="career-location" value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Ej. Santiago" maxLength={100} autoComplete="off" /></div></label>
        <Button type="submit" disabled={loading || !sessionReady || !workspaceReady || retrySeconds > 0 || captureBlocked}>{loading ? <LoaderCircle size={16} className={styles.spinner} /> : <Search size={16} />}{loading ? "Buscando ofertas…" : captureBlocked ? "Fuente no disponible" : retrySeconds > 0 ? "Captura en pausa" : "Buscar ofertas reales"}</Button>
      </form>
      <div className={styles.searchHint}><ShieldCheck size={13} /><span>Búsqueda en Chile · Get on Board · cada requisito conserva su fuente</span></div>
    </section>

    <div aria-live="polite" aria-atomic="true">{loading ? <div className={styles.loading}><LoaderCircle size={20} className={styles.spinner} /><span>Consultando publicaciones en Chile y sus requisitos.</span></div> : hasSearched && !error ? <span className={styles.screenReaderOnly}>{restoredFromStorage ? "Consulta guardada recuperada" : "Consulta completada"}: {offers.length} publicaciones para {capture.query}. Fuente: {capture.source}. Captura del {dateLabel(capture.date)}.</span> : null}</div>
    {storageIssue && <p className={styles.warnings} role="status">{storageIssue}</p>}
    {error && <div className={styles.error}><CircleAlert size={18} /><div><p role="alert">{error}</p>{captureBlocked ? <p>La fuente bloqueó el acceso. La captura se detuvo; puedes seguir revisando las publicaciones guardadas.</p> : retrySeconds > 0 ? <p>Podrás solicitar otra captura en {waitLabel(retrySeconds)}. No se reintentará automáticamente.</p> : null}{offers.length > 0 && <p>Abajo se conserva la consulta anterior: {capture.query}, del {dateLabel(capture.date)}. No son resultados de la búsqueda fallida.</p>}{!captureBlocked && <Button variant="outline" onClick={() => searchOffers()} disabled={loading || retrySeconds > 0}>{retrySeconds > 0 ? "Esperando a la fuente" : "Reintentar búsqueda"}<ArrowRight size={14} /></Button>}</div></div>}

    <div className={styles.workbench}>
    <section ref={jobsRef} tabIndex={-1} id="career-jobs" className={`${styles.section} ${styles.jobsPanel}`} aria-label="Elegir un objetivo laboral" aria-busy={loading}>
      <SectionHeading number="01" title="Publicaciones" description="Elige un cargo para orientar tu ruta." count={`${offers.length}`} />
      <div className={styles.capture}><ShieldCheck size={14} /><span>{capture.reviewed ? "Muestra de publicaciones revisadas previamente" : `${restoredFromStorage ? "Consulta guardada" : "Búsqueda"}: ${capture.query}`}</span>{capture.location && <span>· {capture.location}</span>}<span className={styles.separator}>·</span>{!capture.reviewed && <span>Fuente: {capture.source}</span>}<span>{capture.reviewed ? "Revisión" : "Captura"}: {dateLabel(capture.date)}</span>{capture.cacheHit && !restoredFromStorage && <span>· Resultado de una consulta reciente</span>}</div>
      {capture.coverage && <p className={styles.coverage}>Página {capture.coverage.page}{capture.coverage.totalPages ? ` de ${capture.coverage.totalPages}` : " · total de páginas por confirmar"}. {capture.coverage.matched} coincidencias de {capture.coverage.unique} publicaciones únicas revisadas.{capture.coverage.locationFilter === "text_on_page" ? " La ubicación filtra sólo esta página." : ""}{capture.coverage.hasMore ? " Hay más páginas sin consultar." : ""}</p>}
      {warnings.length > 0 && <details className={styles.warnings}><summary>Consideraciones de esta búsqueda ({warnings.length})</summary><ul>{warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></details>}
      {offers.length ? <>
        <div className={styles.offers}>{offers.slice(0, offerCount).map((offer) => <button ref={offer.id === selected?.id ? selectedButtonRef : undefined} type="button" key={offer.id} aria-pressed={offer.id === selected?.id} className={`${styles.offer} ${offer.id === selected?.id ? styles.selectedOffer : ""}`} onClick={() => chooseOpportunity(offer)}>
          <div className={styles.offerCompany}><span>{offer.company}</span>{selected?.id === offer.id && <span className={styles.selectedLabel}><Check size={14} />{isRouteObjective ? "Elegido" : "Vista previa"}</span>}</div>
          <h3>{offer.title}</h3><span className={styles.offerLocation}><MapPin size={12} />{offer.location || offer.country}</span>
          <div className={styles.offerSalary}><span>Remuneración publicada</span><strong>{offer.remuneration || "No publicada"}</strong></div>
          <div className={styles.offerFooter}><span>{experienceLabel(offer)}</span><span>{selected?.id === offer.id ? isRouteObjective ? "Mi objetivo" : "En vista previa" : "Explorar"}<ArrowUpRight size={12} style={{ display: "inline", marginLeft: 3 }} /></span></div>
        </button>)}</div>
        {offers.length > offerCount && <div className={styles.moreOffers}><Button variant="outline" onClick={() => setOfferCount((count) => count + 6)}>Ver más publicaciones<ChevronDown size={15} /></Button><span className={styles.salaryNote}>{offerCount} de {offers.length} visibles</span></div>}
        {groups.length > 0 && <details className={styles.warnings}><summary>Comparar salarios publicados con condiciones equivalentes</summary><div className={styles.salaryGroups}>{groups.map((group) => <div className={styles.salaryGroup} key={group.key}><span>{group.label}</span><strong>{salaryRange(group.min, group.max)} · {group.count} {group.count === 1 ? "publicación" : "publicaciones"}</strong><span>{group.note}</span>{group.opportunities.map((offer) => <Source key={offer.id} url={offer.sourceUrl} label={`${offer.title} · ${offer.company}`} />)}</div>)}</div></details>}
        <p className={styles.salaryNote}>Los montos pertenecen a cada cargo y sus condiciones. No representan un sueldo promedio ni cuánto paga una habilidad por sí sola.</p>
        {!groups.length && <p className={styles.salaryNote}>Los montos sin período confirmado se muestran en cada oferta y quedan fuera de la comparación salarial.</p>}
      </> : <div className={styles.empty}><strong>{hasSearched ? "No encontramos publicaciones utilizables para esta búsqueda." : "Empieza buscando un cargo."}</strong>{hasSearched ? "Prueba un nombre más amplio o quita la ubicación. Un resultado vacío no demuestra que no existan oportunidades." : "Consultaremos ofertas reales y construiremos tu ruta a partir de los requisitos publicados."}</div>}
    </section>

    <section ref={detailRef} tabIndex={-1} className={styles.detailPanel} aria-label="Detalle del objetivo">
      <button type="button" className={styles.backToResults} onClick={returnToResults}>← Volver a los resultados</button>
      {selected && <div className={styles.selectedContext}><div><small>{isRouteObjective ? "OBJETIVO DE TU RUTA" : "VISTA PREVIA · ELIGE UN CARGO PARA TU RUTA"}</small><h2>{selected.title}</h2><p>{selected.company} · {selected.location || selected.country}</p><div className={styles.targetFacts}><strong>{selected.remuneration || "Remuneración no publicada"}</strong><span>{experienceLabel(selected)}</span></div><p>Fuente observada el {dateLabel(selected.observedAt)}. Vigencia por confirmar.</p></div><Source url={selected.sourceUrl} label="Ver oferta original" /></div>}
      {selected && !isRouteObjective && <div className={styles.confirmObjective}><Button onClick={() => onSelectOpportunity(selected)}>Elegir este cargo como objetivo<Check size={15} /></Button><p>Explorar esta publicación no cambia tu ruta hasta que la elijas como objetivo.</p></div>}
      <div className={styles.detailTabs} role="tablist" aria-label="Revisar el objetivo">{DETAIL_TABS.map((tab, index) => <button key={tab.id} id={`career-tab-${tab.id}`} type="button" role="tab" aria-selected={detailTab === tab.id} aria-controls={`career-${tab.id}`} tabIndex={detailTab === tab.id ? 0 : -1} onClick={() => setDetailTab(tab.id)} onKeyDown={(event) => {
        const next = event.key === "ArrowRight" ? (index + 1) % DETAIL_TABS.length : event.key === "ArrowLeft" ? (index + DETAIL_TABS.length - 1) % DETAIL_TABS.length : event.key === "Home" ? 0 : event.key === "End" ? DETAIL_TABS.length - 1 : -1;
        if (next < 0) return; event.preventDefault(); setDetailTab(DETAIL_TABS[next].id); document.getElementById(`career-tab-${DETAIL_TABS[next].id}`)?.focus();
      }}>{tab.label}</button>)}</div>
    <section id="career-skills" className={styles.section} hidden={detailTab !== "skills"} role="tabpanel" aria-labelledby="career-tab-skills">
      {selected && <details className={styles.warnings}><summary>Ver descripción, requisitos y condiciones originales</summary><p style={{ whiteSpace: "pre-wrap", lineHeight: 1.8, marginTop: 12 }}>{selected.description || "Descripción no disponible; consulta la fuente original."}</p><p style={{ marginTop: 10 }}>{selected.scheduleText}</p><ul>{selected.limits.map((limit, index) => <li key={`${selected.id}-${index}`}>{limit}</li>)}</ul></details>}
      <SectionHeading number="02" title="¿Qué pide tu cargo objetivo?" description={selected ? `Requisitos de ${selected.title}, en ${selected.company}. Marca lo que puedes respaldar con un proyecto, trabajo o experiencia.` : "Selecciona una publicación para revisar sus capacidades y documentar lo que sabes."} count={`${signals.length} capacidades`} />
      {signals.length ? <>
        <div className={styles.skillsLayout}>
          <div className={styles.skillsPanel}><h3>Capacidades de tu cargo objetivo</h3><p>Los contadores muestran su presencia en las {offers.length} publicaciones consultadas. Tu ruta se basa en el cargo seleccionado; lo que marques requiere revisión.</p><div className={styles.skillList}>{signals.slice(0, showAllSkills ? signals.length : 8).map((skill) => <div className={`${styles.skillRow} ${activeSkill?.id === skill.id ? styles.activeSkill : ""}`} key={skill.id}><button type="button" onClick={() => setActiveSkillId(skill.id)} aria-pressed={activeSkill?.id === skill.id}><span><strong>{skill.label}</strong><small>{skill.mentions} {skill.mentions === 1 ? "publicación" : "publicaciones"} en la muestra · {skill.requiredCount} como requisito</small></span><ArrowUpRight size={13} /></button><label className={styles.skillToggle}><input type="checkbox" checked={profile.demonstratedSkills.includes(skill.id)} onChange={() => toggleSkill(skill.id)} aria-label={`Declaro que puedo respaldar ${skill.label}`} /><span>Autodeclarada</span></label></div>)}</div>{signals.length > 8 && <div className={styles.moreOffers}><Button variant="ghost" onClick={() => setShowAllSkills((value) => !value)}>{showAllSkills ? "Ver menos habilidades" : `Ver las ${signals.length} habilidades`}<ChevronDown size={14} /></Button></div>}</div>
          {activeSkill && <aside className={styles.skillEvidence} aria-label={`Fuentes para ${activeSkill.label}`}><div className={styles.eyebrow}><Target size={13} />CAPACIDAD EN CONTEXTO</div><h3>{activeSkill.label}</h3><p>{documentedSkillIds.includes(activeSkill.id) ? "Tienes un registro relacionado en tu carpeta de evidencias. Sigue pendiente de revisión; no acredita dominio por sí solo." : profile.demonstratedSkills.includes(activeSkill.id) ? "La declaraste como una capacidad que puedes respaldar, pero todavía no hay un registro relacionado en tu carpeta. Agrega tu trabajo para que pueda revisarse." : "Todavía no hay un registro relacionado en tu carpeta. Puedes documentar lo que sabes; esto no demuestra falta de capacidad."}</p>{activeRequirement && selected && <article><strong>Así aparece en tu cargo objetivo</strong><blockquote>{activeRequirement.evidence || "Mención identificada en la descripción; revisar alcance en la fuente."}</blockquote><Source url={selected.sourceUrl} label="Revisar requisito original" /></article>}{activeSkill.salaryExamples.slice(0, 2).map((example) => <article key={example.sourceUrl}><strong>{example.title}</strong><p>{example.company} · Cargo de la muestra que menciona esta habilidad</p><blockquote>{example.remuneration}</blockquote><Source url={example.sourceUrl} label="Revisar cargo y salario" /></article>)}{!activeSkill.salaryExamples.length && <p>Los avisos de esta muestra que mencionan esta habilidad no aportan un salario comparable.</p>}<p>El salario corresponde al conjunto de responsabilidades del cargo.</p></aside>}
        </div>
        <div className={styles.profileBar}><UserRound size={24} /><div><strong>{undocumentedSkills.length ? `${undocumentedSkills.length} ${undocumentedSkills.length === 1 ? "capacidad por documentar" : "capacidades por documentar"} para este objetivo` : "Tienes registros relacionados con las capacidades de este objetivo"}</strong><p>{undocumentedSkills.length ? "Marcar una capacidad es una autodeclaración. Agregar un trabajo es un paso distinto; ambos requieren revisión." : "Los registros siguen pendientes de revisión por un docente o supervisor."}</p></div><Button variant="outline" onClick={() => openProfile()}>Agregar mis evidencias<ArrowRight size={14} /></Button></div>
      </> : <div className={styles.empty}><strong>Aún no hay requisitos suficientes para armar esta comparación.</strong>Busca otro cargo o revisa las descripciones originales. No inferimos habilidades que la publicación no menciona.</div>}
    </section>

    <section id="career-learning" className={styles.section} hidden={detailTab !== "learning"} role="tabpanel" aria-labelledby="career-tab-learning">
      <SectionHeading number="03" title="Aprende con un propósito claro." description="Explora formación universitaria vinculada a esas capacidades, con duración y condiciones visibles. Incluye opciones de inteligencia artificial." />
      <div className={styles.courseTools} role="group" aria-label="Filtrar formación"><span>Explorar</span><button type="button" className={courseFilter === "matching" ? styles.activeFilter : ""} aria-pressed={courseFilter === "matching"} onClick={() => { setCourseFilter("matching"); setCourseCount(3); }}>Según mi perfil</button><button type="button" className={courseFilter === "ai" ? styles.activeFilter : ""} aria-pressed={courseFilter === "ai"} onClick={() => { setCourseFilter("ai"); setCourseCount(3); }}><Sparkles size={12} style={{ display: "inline", marginRight: 4 }} />Inteligencia artificial</button><button type="button" className={courseFilter === "all" ? styles.activeFilter : ""} aria-pressed={courseFilter === "all"} onClick={() => { setCourseFilter("all"); setCourseCount(3); }}>Toda la formación</button></div>
      {courseFilter === "matching" && pendingSkills.length > 0 && <div className={styles.focusPills}>{pendingSkills.slice(0, 6).map((skill) => <span key={skill.id}>{skill.label}</span>)}{pendingSkills.length > 6 && <span>+{pendingSkills.length - 6} capacidades</span>}</div>}
      {visibleCourses.length ? <><div className={styles.courses}>{visibleCourses.slice(0, courseCount).map(({ course, matchedSkills }) => <article className={styles.course} key={course.id}>
        <div className={styles.courseTop} /><div className={styles.courseBody}><div className={styles.courseInstitution}><GraduationCap size={16} /><span>{course.institution} · {course.country}</span></div><h3>{course.title}</h3><p className={styles.courseMatch}>{matchedSkills.length ? `Conecta con ${matchedSkills.map((skill) => skillLabels.get(skill) || skill).join(", ")}` : "Formación para explorar según tus intereses"}</p>
          <dl><div><dt>Modalidad</dt><dd>{course.modality || "Por confirmar"}</dd></div><div><dt>Duración</dt><dd>{course.durationText || "No publicada"}</dd></div><div><dt>Precio</dt><dd>{course.priceText || "No publicado"}</dd></div><div><dt>Credencial</dt><dd>{course.credential || "Por confirmar"}</dd></div></dl>
          <p className={styles.courseRequirements}><strong>Antes de empezar:</strong> {course.prerequisites || "Requisitos por confirmar"}</p>
          <details><summary>Requisitos y alcance</summary><p><strong>Antes de empezar:</strong> {course.prerequisites || "Requisitos por confirmar"}</p><p>{course.evidence}</p>{course.limits.map((limit, index) => <p key={`${course.id}-${index}`}>{limit}</p>)}</details>
          <div className={styles.courseBottom}><p className={styles.courseState}>{COURSE_STATES[course.enrollmentStatus]} · Revisión: {dateLabel(course.observedAt)}</p><Source url={course.url} label="Consultar formación oficial" /></div>
        </div>
      </article>)}</div>{visibleCourses.length > courseCount && <div className={styles.moreOffers}><Button variant="outline" onClick={() => setCourseCount((count) => count + 3)}>Ver más formación<ChevronDown size={14} /></Button></div>}</> : <div className={styles.empty}><strong>{courseFilter === "matching" && !selected ? "Elige un cargo para orientar la formación." : courseFilter === "matching" && !signals.length ? "El cargo aún no aporta requisitos comparables." : courseFilter === "matching" && !pendingSkills.length ? "Declaraste respaldo para las capacidades de este objetivo." : "Aún no hay una formación documentada para esta selección."}</strong>{courseFilter === "matching" ? "Puedes explorar inteligencia artificial o consultar todo el catálogo. Las coincidencias no sustituyen revisar el nivel y los requisitos de entrada." : "El catálogo inicial es acotado. Consulta la fuente universitaria para verificar la oferta disponible."}</div>}
      <div className={styles.learningFoot}><p><strong>¿Ya estudias una carrera?</strong><br />Revisa qué parte de estos requisitos aparece en su malla y qué necesita una revisión más detallada.</p><Button variant="outline" onClick={openComparison} disabled={!selected}>Comparar mi malla<BookOpen size={15} /></Button></div>
    </section>

    <section id="career-experience" className={styles.section} hidden={detailTab !== "experience"} role="tabpanel" aria-labelledby="career-tab-experience">
      <SectionHeading number="04" title="La experiencia también necesita una oportunidad." description="Revisa prácticas, cargos iniciales y publicaciones que aceptan proyectos. Sus condiciones de entrada importan tanto como las habilidades." />
      <div className={styles.experienceIntro}><Clock3 size={15} color="#006b5f" /><label htmlFor="career-hours">Puedo dedicar<Input id="career-hours" type="number" min={1} max={80} value={profile.hoursPerWeek} onChange={(event) => onProfileChange({ ...profile, hoursPerWeek: Math.max(1, Math.min(80, Number(event.target.value) || 1)) })} />horas por semana</label><span>Opciones con una habilidad específica compartida con tu objetivo. Primero las que indican {profile.country}; las barreras de acceso se revisan por separado.</span></div>
      {relevantExperiences.length ? <div className={styles.experience}>{relevantExperiences.slice(0, 4).map(({ offer, access }) => <article className={styles.experienceCard} key={offer.id}>
        <div className={styles.experienceHead}><div><h3>{offer.title}</h3><p>{offer.company} · {offer.country}</p></div><span className={styles.experienceBadge}>{offer.kind === "internship" ? "Práctica" : offer.acceptsProjects ? "Acepta proyectos" : "Vía de entrada"}</span></div>
        <div className={styles.experienceFacts}><div><span>Disponibilidad</span>{offer.hoursPerWeek === null ? "Horas por confirmar" : `${offer.hoursPerWeek} horas semanales`} · {experienceLabel(offer)}</div><div><span>Remuneración</span>{offer.remuneration || "No publicada"}</div><div><span>Acompañamiento</span>{offer.supervision || "Supervisión por confirmar"}</div><div><span>Acceso</span>{offer.studentRequired === true ? "Exige matrícula vigente" : offer.studentRequired === false ? "No exige matrícula" : "Matrícula por confirmar"} · Fuente: {dateLabel(offer.observedAt)}</div></div>
        <p className={styles.accessReasons}><strong>{access.barriers.length ? `${access.barriers.length} ${access.barriers.length === 1 ? "barrera a revisar" : "barreras a revisar"}` : access.status === "needs_review" ? "Condiciones por confirmar" : "Condiciones compatibles con los datos actuales"}.</strong> {access.barriers[0]?.detail || access.unknown[0]?.detail || "Revisa las condiciones originales antes de postular."}</p>
        {!countryMatches(offer.country, profile.country) && <p className={styles.accessReasons}>{offer.country === "Por confirmar" ? "País de la publicación por confirmar." : `Ubicación distinta de ${profile.country}: confirma residencia, permisos y modalidad con la institución.`}</p>}
        <div className={styles.experienceActions}><Button variant="outline" onClick={() => openProfile(offer)}>Elegir y revisar mi acceso<ArrowRight size={14} /></Button><Source url={offer.sourceUrl} /></div>
      </article>)}</div> : <div className={styles.empty}><strong>No encontramos una vía de entrada documentada para esta área.</strong>Busca una práctica o un cargo junior. Una falta de oportunidades visibles no demuestra falta de capacidad.</div>}
    </section>
    </section>
    </div>
    <div className={styles.closing}><BriefcaseBusiness size={24} /><p><strong>Tu ruta puede cambiar a medida que cambie el mercado.</strong><br />Conserva tus evidencias, revisa nuevas publicaciones y vuelve a elegir el siguiente paso.</p></div>
  </div>;
}
