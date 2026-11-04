"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, Bell, BriefcaseBusiness, ChartNoAxesCombined, Check, CheckCircle2, ChevronRight, CircleHelp, Clock3, GitBranch, Info, ListChecks, LoaderCircle, RefreshCw, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { APPLICATION_STATES, type AccountSummary, type ActionInput, type ActionType, type ApplicationView, type EvidenceKind, type RequestView, type Signal, type VacancyView, type WorkspaceView } from "@/lib/skill-path/types";
import styles from "./workspace.module.css";

type Section = "applications" | "vacancies" | "attention" | "metrics";
type ApplicationFilter = "all" | "stale" | "communication" | "review" | "discrepancy";
type ActionFields = Omit<ActionInput, "accountId" | "expectedVersion" | "idempotencyKey">;
type ActionTarget = { application?: ApplicationView; vacancy?: VacancyView };

const SECTIONS: { id: Section; label: string; detail: string; icon: typeof ListChecks }[] = [
  { id: "applications", label: "Postulaciones", detail: "Estado y siguiente paso", icon: ListChecks },
  { id: "vacancies", label: "Vacantes", detail: "Disponibilidad y condiciones", icon: BriefcaseBusiness },
  { id: "attention", label: "Atención y revisión", detail: "Lo que falta confirmar", icon: ShieldCheck },
  { id: "metrics", label: "Métricas", detail: "Actividad de tu alcance", icon: ChartNoAxesCombined },
];
const EVIDENCE: Record<EvidenceKind, { label: string; className: string; icon: typeof Check }> = {
  confirmed: { label: "Confirmado", className: styles.confirmed, icon: CheckCircle2 },
  inferred: { label: "Inferido", className: styles.inferred, icon: GitBranch },
  stale: { label: "Desactualizado", className: styles.outdated, icon: Clock3 },
  missing: { label: "Información ausente", className: styles.missing, icon: CircleHelp },
};
const ACTION_COPY: Record<ActionType, { label: string; description: string; submit: string }> = {
  change_state: { label: "Actualizar etapa", description: "Registra una decisión humana. El estado anterior y la persona responsable quedan en la historia.", submit: "Confirmar cambio de etapa" },
  correct_state: { label: "Corregir estado", description: "Una corrección manual añade un evento nuevo. La historia y las inconsistencias originales se conservan.", submit: "Registrar corrección manual" },
  request_correction: { label: "Solicitar corrección", description: "Describe qué información de tu postulación necesita revisión. Esta solicitud no modifica una decisión de selección.", submit: "Enviar solicitud de revisión" },
  refer_review: { label: "Derivar a revisión", description: "Deja el caso visible para una persona autorizada. La derivación no cambia el estado ni perjudica al candidato.", submit: "Derivar caso" },
  resolve_review: { label: "Registrar revisión humana", description: "Documenta lo revisado y si aún falta información. Resolver una revisión no decide una contratación ni un descarte.", submit: "Guardar revisión" },
  remind: { label: "Crear recordatorio", description: "Se registra un recordatorio interno para dar seguimiento. Esta demostración no envía correos ni mensajes.", submit: "Registrar recordatorio" },
  request_vacancy_pause: { label: "Solicitar pausa", description: "Tu cuenta no puede pausar directamente la vacante. La solicitud queda registrada para una persona autorizada.", submit: "Registrar solicitud de pausa" },
  request_vacancy_close: { label: "Solicitar cierre", description: "Tu cuenta no puede cerrar directamente la vacante. La solicitud conserva la historia y no descarta postulaciones.", submit: "Registrar solicitud de cierre" },
  pause_vacancy: { label: "Pausar vacante", description: "La vacante dejará de estar disponible. Las postulaciones y sus historias permanecen intactas.", submit: "Confirmar pausa" },
  close_vacancy: { label: "Cerrar vacante", description: "El cierre requiere tu confirmación. Los procesos históricos seguirán disponibles para las cuentas autorizadas.", submit: "Confirmar cierre" },
  correct_information: { label: "Corregir información", description: "Corrige un dato operativo dentro de tu alcance y documenta su respaldo. No modifica la etapa de selección.", submit: "Guardar corrección" },
};

function date(value: string | null | undefined): string {
  if (!value) return "Información no disponible";
  const parsed = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  return Number.isFinite(parsed.valueOf()) ? parsed.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "Fecha por confirmar";
}
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es"); }
function Badge({ kind, children }: { kind: EvidenceKind; children?: ReactNode }) {
  const meta = EVIDENCE[kind]; const Icon = meta.icon;
  return <span className={`${styles.badge} ${meta.className}`}><Icon size={11} aria-hidden="true" />{children || meta.label}</span>;
}
function Empty({ title, children }: { title: string; children: ReactNode }) { return <div className={styles.empty}><strong>{title}</strong>{children}</div>; }
function Signals({ signals }: { signals: Signal[] }) {
  return <ul className={styles.findings}>{signals.map((signal, index) => <li key={`${signal.code}-${index}`} className={styles.finding}><Badge kind={signal.kind} /> <strong>{signal.title}</strong><p>{signal.detail}</p></li>)}</ul>;
}
function RequestList({ requests }: { requests: RequestView[] }) {
  return <div>{requests.map((request) => <article key={request.id} className={styles.request}><div className={styles.itemTop}><span>{request.id} · {date(request.at)}</span><span className={`${styles.badge} ${request.status === "attended" ? styles.confirmed : styles.review}`}>{request.status === "attended" ? "Atendida" : "Pendiente de atención"}</span></div><strong>{ACTION_COPY[request.type as ActionType]?.label || request.type}</strong><p>{request.note}</p><p>{request.applicationId || request.vacancyId} · Responsable registrado: {request.actorId}</p></article>)}</div>;
}
function ActionForm({ action, target, busy, technicalAdmin, onSubmit, onCancel }: { action: ActionType; target: ActionTarget; busy: boolean; technicalAdmin: boolean; onSubmit: (fields: ActionFields, key: string) => Promise<boolean>; onCancel: () => void }) {
  const [note, setNote] = useState("");
  const [newState, setNewState] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [resolution, setResolution] = useState<"reviewed" | "needs_information">("needs_information");
  const [field, setField] = useState<NonNullable<ActionInput["field"]>>(technicalAdmin ? "fuente_estado" : "requisitos_cumplidos");
  const [value, setValue] = useState("");
  const [validation, setValidation] = useState("");
  const intentKey = useRef<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const isState = action === "change_state" || action === "correct_state";
  const requiresConfirmation = isState || action === "pause_vacancy" || action === "close_vacancy";
  const options = action === "change_state" ? target.application?.availableTransitions || [] : APPLICATION_STATES.filter((state) => state !== target.application?.state);
  useEffect(() => { headingRef.current?.focus({ preventScroll: true }); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (note.trim().length < 8) { setValidation("Explica el motivo con al menos 8 caracteres."); return; }
    if (isState && !options.includes(newState as typeof APPLICATION_STATES[number])) { setValidation("Selecciona el estado que deseas registrar."); return; }
    if (requiresConfirmation && !confirmed) { setValidation("Confirma que revisaste la evidencia y autorizas esta acción."); return; }
    setValidation("");
    intentKey.current ||= crypto.randomUUID();
    const fields: ActionFields = { action, note: note.trim(), ...(target.application ? { applicationId: target.application.id } : { vacancyId: target.vacancy?.id }) };
    if (isState) fields.newState = newState as typeof APPLICATION_STATES[number];
    if (requiresConfirmation) fields.humanConfirmed = confirmed;
    if (action === "resolve_review") fields.resolution = resolution;
    if (action === "correct_information") { fields.field = field; fields.value = value || null; }
    if (await onSubmit(fields, intentKey.current)) onCancel();
  }
  return <form className={styles.form} onSubmit={submit}>
    <h3 ref={headingRef} tabIndex={-1}>{ACTION_COPY[action].label}</h3><p>{ACTION_COPY[action].description}</p>
    {isState && <label className={styles.field}>Nuevo estado<select value={newState} onChange={(event) => { setNewState(event.target.value); intentKey.current = null; }} required disabled={busy}><option value="">Seleccionar estado</option>{options.map((state) => <option key={state}>{state}</option>)}</select></label>}
    {action === "resolve_review" && <label className={styles.field}>Resultado de la revisión<select value={resolution} onChange={(event) => { setResolution(event.target.value as typeof resolution); intentKey.current = null; }} disabled={busy}><option value="needs_information">Todavía falta información</option><option value="reviewed">Revisión atendida y documentada</option></select></label>}
    {action === "correct_information" && <><label className={styles.field}>Dato que vas a corregir<select value={field} disabled={busy} onChange={(event) => { setField(event.target.value as typeof field); setValue(""); intentKey.current = null; }}>{!technicalAdmin && <option value="requisitos_cumplidos">Requisitos publicados contrastados</option>}<option value="fuente_estado">Fuente del estado</option><option value="fecha_ultima_comunicacion">Fecha de última comunicación</option><option value="canal_comunicacion">Canal de comunicación</option></select></label><label className={styles.field}>Valor confirmado{field === "fecha_ultima_comunicacion" ? <input type="date" value={value} onChange={(event) => { setValue(event.target.value); intentKey.current = null; }} disabled={busy} /> : <select value={value} onChange={(event) => { setValue(event.target.value); intentKey.current = null; }} disabled={busy}><option value="">Información no disponible</option>{(field === "requisitos_cumplidos" ? ["Sí", "Parcial", "No"] : field === "fuente_estado" ? ["Empresa", "Plataforma", "Sistema"] : ["Correo electrónico", "Teléfono", "Mensajería de plataforma"]).map((option) => <option key={option}>{option}</option>)}</select>}<small>Un dato vacío se conserva como ausencia de información.</small></label></>}
    <label className={styles.field}>{action === "request_correction" ? "Qué necesitas que revisemos" : "Motivo y evidencia revisada"}<textarea value={note} onChange={(event) => { setNote(event.target.value); intentKey.current = null; }} minLength={8} maxLength={800} required disabled={busy} placeholder={action === "request_correction" ? "Indica qué dato de esta postulación requiere revisión…" : "Explica qué verificaste y por qué registras esta acción…"} /><small>Utiliza sólo información del caso ficticio. No incluyas datos personales reales.</small></label>
    {requiresConfirmation && <label className={styles.check}><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} disabled={busy} required /><span>Revisé la evidencia disponible y confirmo esta acción como persona autorizada. No es una decisión automática.</span></label>}
    {validation && <p role="alert" className={styles.error}>{validation}</p>}
    <div className={styles.formButtons}><button className={styles.primary} type="submit" disabled={busy}>{busy ? <LoaderCircle size={15} className={styles.spin} aria-hidden="true" /> : <Check size={15} aria-hidden="true" />}{busy ? "Guardando…" : ACTION_COPY[action].submit}</button><button className={styles.secondary} type="button" disabled={busy} onClick={onCancel}>Cancelar</button></div>
  </form>;
}
function Actions({ target, busy, technicalAdmin = false, onSubmit }: { target: ActionTarget; busy: boolean; technicalAdmin?: boolean; onSubmit: (fields: ActionFields, key: string) => Promise<boolean> }) {
  const [action, setAction] = useState<ActionType | null>(null);
  const allowed = (target.application || target.vacancy)?.allowedActions || [];
  if (!allowed.length) return null;
  return <section className={styles.actions} aria-label="Acciones permitidas"><h3>Tu siguiente acción</h3><p className={styles.meaning}>Disponible dentro del alcance de esta cuenta.</p><div className={styles.actionGrid}>{allowed.map((type) => <button type="button" className={styles.secondary} key={type} disabled={busy || (type === "change_state" && !target.application?.availableTransitions.length)} aria-expanded={action === type} onClick={() => setAction((current) => current === type ? null : type)}>{ACTION_COPY[type].label}{type === "remind" ? <Bell size={14} aria-hidden="true" /> : <ArrowRight size={14} aria-hidden="true" />}</button>)}</div>{action && allowed.includes(action) && <ActionForm key={`${action}-${target.application?.id || target.vacancy?.id}`} action={action} target={target} busy={busy} technicalAdmin={technicalAdmin} onSubmit={onSubmit} onCancel={() => setAction(null)} />}</section>;
}
function ApplicationDetail({ application, candidate, technicalAdmin, busy, onSubmit, onBack }: { application: ApplicationView; candidate: boolean; technicalAdmin: boolean; busy: boolean; onSubmit: (fields: ActionFields, key: string) => Promise<boolean>; onBack: () => void }) {
  return <>
    <button type="button" className={`${styles.textButton} ${styles.back}`} onClick={onBack}><ArrowLeft size={15} aria-hidden="true" />Volver a las postulaciones</button>
    <header className={styles.detailHeader}><div className={styles.eyebrow}>{application.id} · {application.vacancyId}</div><h2>{application.vacancyTitle}</h2><p>{application.companyId || "Empresa por confirmar"}{!candidate && application.candidateId ? ` · Candidato ${application.candidateId}` : ""}</p><div className={styles.statusLine}><strong>{application.state || "Estado por confirmar"}</strong><Badge kind={application.stateKind} />{application.stale && <Badge kind="stale" />}</div><p className={styles.meaning}>{application.stateMeaning}</p></header>
    <div className={styles.detailBody}>
      <dl className={styles.facts}><div><dt>Estado actualizado</dt><dd>{date(application.updatedAt)}</dd></div><div><dt>Fuente del estado</dt><dd>{application.source || "Información no disponible"}</dd></div><div><dt>Postulación registrada</dt><dd>{date(application.appliedAt)}</dd></div><div><dt>Última actividad</dt><dd>{date(application.lastActivityAt)}{application.daysSinceActivity !== null && <><br /><span>{application.daysSinceActivity} días transcurridos</span></>}</dd></div></dl>
      <section className={styles.nextStep}><h3><ArrowRight size={16} aria-hidden="true" />Siguiente paso esperado</h3><p>{application.nextStep}</p></section>
      <section className={styles.subsection}><h3>Última comunicación</h3><Badge kind={application.communication.confirmed ? "confirmed" : "missing"} /><p style={{ marginTop: 10 }}>{application.communication.explanation}</p><dl className={styles.facts} style={{ marginTop: 13 }}><div><dt>Fecha registrada</dt><dd>{date(application.communication.at)}</dd></div><div><dt>Canal registrado</dt><dd>{application.communication.channel || "Información no disponible"}</dd></div></dl></section>
      {!candidate && <section className={styles.subsection}><h3>Requisitos publicados</h3><p>Contraste registrado: <strong>{application.requirementsMet || "Información no disponible"}</strong>. Este dato no decide por sí solo el resultado del proceso.</p></section>}
      {(application.requiresReview || application.reviewAttended) && <div className={styles.notice} style={{ marginBottom: 0 }}><ShieldCheck size={18} aria-hidden="true" /><div><strong>{application.requiresReview ? "Revisión humana pendiente" : "Revisión atendida"}</strong><p>{application.requiresReview ? "El caso permanece visible para su atención. Su estado de selección se conserva." : "La revisión quedó documentada. Puedes consultar la evidencia que sigue disponible."}</p></div></div>}
      {!!application.signals.length && <section className={styles.subsection}><h3>Qué sabemos y qué falta confirmar</h3><p>Las señales ayudan a revisar la evidencia; no sustituyen el estado registrado.</p><Signals signals={application.signals} /></section>}
      {!candidate && <section className={styles.subsection}><h3>Historia de la postulación</h3><p>Eventos conservados con su fuente. Las correcciones añaden una nueva entrada.</p>{application.events.length ? <ol className={styles.timeline}>{application.events.map((event) => <li key={event.id}><time dateTime={event.at}>{date(event.at)}</time><strong>{event.type}</strong>{event.addedInDemo && <span className={`${styles.badge} ${styles.inferred}`} style={{ marginLeft: 8 }}>Registrado en el MVP</span>}<div className={styles.eventState}><span>{event.previousState || "Estado anterior no informado"}</span><ArrowRight size={12} aria-hidden="true" /><span>{event.newState || "Estado nuevo no informado"}</span></div><p>Actor: {event.actorId || "Información no disponible"} · {event.actorType || "Tipo por confirmar"}</p><p>Origen: {event.origin || "Información no disponible"} · {event.id}</p>{event.note && <p>{event.note}</p>}{event.requiresReview && <div className={styles.tags}><span className={`${styles.badge} ${styles.review}`}>Evento marcado para revisión</span></div>}</li>)}</ol> : <p style={{ marginTop: 12 }}>No hay eventos disponibles para confirmar esta historia.</p>}</section>}
      {!!application.requests.length && <section className={styles.subsection}><h3>{candidate ? "Mis solicitudes" : "Solicitudes vinculadas"}</h3><RequestList requests={application.requests} /></section>}
      <Actions key={application.id} target={{ application }} busy={busy} technicalAdmin={technicalAdmin} onSubmit={onSubmit} />
    </div>
  </>;
}

export function SkillPathWorkspace() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [accountId, setAccountId] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [section, setSection] = useState<Section>("applications");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ApplicationFilter>("all");
  const [selectedId, setSelectedId] = useState("");
  const [limit, setLimit] = useState(12);
  const [vacancyQuery, setVacancyQuery] = useState("");
  const [vacancyFilter, setVacancyFilter] = useState("all");
  const [vacancyLimit, setVacancyLimit] = useState(12);
  const [reloadToken, setReloadToken] = useState(0);
  const activeAccount = useRef("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLElement>(null);
  const resultsRef = useRef<HTMLElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const data = workspace?.account.id === accountId ? workspace : null;
  const candidate = data?.account.role === "Candidato";

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/skill-path/accounts", { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("No pudimos cargar las cuentas de demostración.");
      const result = await response.json() as { accounts: AccountSummary[] };
      if (!Array.isArray(result.accounts) || !result.accounts.length) throw new Error("El paquete de cuentas no está disponible.");
      if (controller.signal.aborted) return;
      setAccounts(result.accounts); const first = result.accounts.find((account) => account.id === "USR-001") || result.accounts[0]; activeAccount.current = first.id; setAccountId(first.id);
    }).catch((failure: unknown) => { if (!controller.signal.aborted) { setError(failure instanceof Error ? failure.message : "No se pudo abrir la demostración."); setLoading(false); } });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!accountId) return;
    const controller = new AbortController();
    fetch(`/api/skill-path/workspace?accountId=${encodeURIComponent(accountId)}`, { signal: controller.signal, cache: "no-store" }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No pudimos abrir esta cuenta.");
      if (controller.signal.aborted || activeAccount.current !== accountId) return;
      const next = result as WorkspaceView; setWorkspace(next); setLoading(false); setSelectedId((old) => next.applications.some((item) => item.id === old) ? old : next.applications[0]?.id || "");
    }).catch((failure: unknown) => { if (!controller.signal.aborted && activeAccount.current === accountId) { setError(failure instanceof Error ? failure.message : "No pudimos consultar los datos."); setLoading(false); } });
    return () => controller.abort();
  }, [accountId, reloadToken]);

  function chooseAccount(id: string) {
    activeAccount.current = id; setWorkspace(null); setAccountId(id); setSelectedId(""); setError(""); setMessage(""); setLoading(true); setSection("applications"); setQuery(""); setFilter("all"); setLimit(12); setVacancyQuery(""); setVacancyFilter("all"); setVacancyLimit(12);
  }
  function refresh() { setLoading(true); setError(""); setReloadToken((value) => value + 1); }
  function navigate(next: Section) {
    setSection(next); setMessage(""); setError("");
    requestAnimationFrame(() => { headingRef.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "auto" }); });
  }
  function chooseApplication(id: string) {
    setSelectedId(id);
    if (window.matchMedia("(max-width: 700px)").matches) requestAnimationFrame(() => { detailRef.current?.focus({ preventScroll: true }); detailRef.current?.scrollIntoView({ behavior: "auto", block: "start" }); });
  }
  function openCase(id: string) { setSelectedId(id); setQuery(""); setFilter("all"); navigate("applications"); }
  async function submitAction(fields: ActionFields, idempotencyKey: string): Promise<boolean> {
    if (!data || busy) return false;
    setBusy(true); setError(""); setMessage(""); const requestAccount = data.account.id;
    try {
      const response = await fetch("/api/skill-path/actions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, accountId: requestAccount, expectedVersion: data.version, idempotencyKey } satisfies ActionInput) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409) { setReloadToken((value) => value + 1); throw new Error(`${result.error || "Otra acción actualizó los datos."} Actualizamos la vista; revisa la información antes de volver a confirmar.`); }
        throw new Error(result.error || "La acción no pudo registrarse.");
      }
      if (activeAccount.current !== requestAccount) return false;
      const updatedResponse = await fetch(`/api/skill-path/workspace?accountId=${encodeURIComponent(requestAccount)}`, { cache: "no-store" });
      if (!updatedResponse.ok) { setMessage("La acción quedó registrada. Actualiza la vista para consultar la información más reciente."); return true; }
      const updated = await updatedResponse.json() as WorkspaceView;
      if (activeAccount.current === requestAccount) { setWorkspace(updated); setMessage(result.message || "Acción registrada con trazabilidad."); }
      return true;
    } catch (failure) { if (activeAccount.current === requestAccount) setError(failure instanceof Error ? failure.message : "No pudimos confirmar el resultado. Puedes reintentar la misma acción sin duplicarla."); return false; }
    finally { setBusy(false); }
  }

  const applications = (data?.applications || []).filter((item) => normalize(`${item.id} ${item.vacancyTitle} ${item.companyId || ""} ${item.candidateId || ""}`).includes(normalize(query)) && (filter === "all" || filter === "stale" && item.stale || filter === "communication" && !item.communication.confirmed || filter === "review" && item.requiresReview || filter === "discrepancy" && item.discrepancy));
  const selected = applications.find((item) => item.id === selectedId) || applications[0];
  const vacancies = (data?.vacancies || []).filter((vacancy) => normalize(`${vacancy.id} ${vacancy.title} ${vacancy.companyId} ${vacancy.family} ${vacancy.region}`).includes(normalize(vacancyQuery)) && (vacancyFilter === "all" || (vacancyFilter === "expired" ? vacancy.expired : vacancy.state === vacancyFilter)));
  const attention = (data?.applications || []).filter((item) => item.requiresReview || item.stale || item.discrepancy || !item.communication.confirmed);
  const sectionTitle = section === "applications" ? candidate ? "Cada postulación, un siguiente paso." : "Tus procesos, con toda su historia." : section === "vacancies" ? "Oportunidades con información clara." : section === "attention" ? "Lo que necesita una mirada humana." : "El proceso, en cifras verificables.";
  const sectionDescription = section === "applications" ? candidate ? "Consulta qué está confirmado y qué falta revisar en tus postulaciones." : "Revisa la evidencia, detecta excepciones y registra cada intervención." : section === "vacancies" ? "El estado publicado y su vigencia se muestran por separado." : section === "attention" ? "Las alertas conservan el estado original y orientan la revisión." : "Indicadores calculados únicamente sobre el alcance de tu cuenta.";

  return <div className={styles.app}>
    <a className={styles.skipLink} href="#skill-path-main">Saltar al contenido</a>
    <header className={styles.header}><div className={styles.brand}><span className={styles.brandMark}><GitBranch size={24} strokeWidth={1.8} aria-hidden="true" /></span><div><span className={styles.brandName}>Skill path</span><span className={styles.brandTag}>Un proceso claro. Un siguiente paso.</span></div></div><div className={styles.demo}><span className={styles.demoDot} />Demostración con datos ficticios</div></header>
    <div className={styles.shell}>
      <aside className={styles.sidebar}><span className={styles.sideLabel}>Tu espacio de trabajo</span><nav className={styles.nav} aria-label="Secciones de Skill path">{SECTIONS.filter((item) => item.id !== "metrics" || data?.account.permissions.metrics).map((item) => { const Icon = item.icon; return <button key={item.id} type="button" className={`${styles.navButton} ${section === item.id ? styles.navActive : ""}`} aria-current={section === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon size={20} strokeWidth={1.6} aria-hidden="true" /><span>{item.label}<small>{item.detail}</small></span></button>; })}</nav>{data && <div className={styles.scope}><ShieldCheck size={18} aria-hidden="true" /><strong>Tu alcance</strong><p>{data.account.scope}</p><p style={{ marginTop: 8 }}>Las acciones disponibles respetan esta asignación.</p></div>}<div className={styles.sideFooter}><strong>Prueba 2 · Mercado laboral</strong><p style={{ marginTop: 6 }}>Fuentes sintéticas del caso Nexo Laboral Group.</p><p style={{ marginTop: 8 }}>Una señal no es una decisión de selección.</p></div></aside>
      <main className={styles.main} id="skill-path-main" tabIndex={-1}>
        <div className={styles.breadcrumb}>Mi espacio<ChevronRight size={12} aria-hidden="true" />{SECTIONS.find((item) => item.id === section)?.label}</div>
        <div className={styles.contextRow}><div className={styles.intro}><h1 ref={headingRef} tabIndex={-1}>{sectionTitle}</h1><p>{sectionDescription}</p></div></div>
        <section className={styles.accountPanel} aria-label="Cuenta de demostración"><label className={styles.field}>Cuenta ficticia<select value={accountId} onChange={(event) => chooseAccount(event.target.value)} disabled={!accounts.length || busy}>{!accounts.length && <option value="">Cargando cuentas…</option>}{[...new Set(accounts.map((account) => account.role))].map((role) => <optgroup key={role} label={role}>{accounts.filter((account) => account.role === role).map((account) => <option key={account.id} value={account.id}>{account.id} · {account.name}</option>)}</optgroup>)}</select></label><div className={styles.accountMeta}><div><p><strong>{data?.account.role || "Selecciona una cuenta para comenzar"}</strong>{data ? `${data.account.actorId} · ${data.account.scope}` : "Selector de cuentas exclusivo para esta demostración"}</p>{data && <p style={{ marginTop: 5 }}>Fecha de referencia: {date(data.asOf)} · umbral: {data.staleAfterDays} días</p>}</div><button type="button" className={styles.secondary} disabled={!accountId || loading || busy} onClick={refresh}><RefreshCw size={14} aria-hidden="true" />Actualizar</button></div></section>
        {error && <div className={styles.error} role="alert"><TriangleAlert size={18} aria-hidden="true" /><div>{error}{!accounts.length && <p>Recarga la página para volver a consultar el paquete.</p>}</div></div>}
        {message && <div className={styles.success} role="status"><CheckCircle2 size={18} aria-hidden="true" /><span>{message}</span><button type="button" aria-label="Cerrar mensaje" className={styles.textButton} onClick={() => setMessage("")}><X size={14} /></button></div>}
        {loading ? <div className={styles.loading} role="status"><LoaderCircle className={styles.spin} size={25} aria-hidden="true" /><p>Consultando información autorizada para esta cuenta…</p></div> : !data ? <Empty title="No pudimos cargar el espacio de trabajo">Puedes actualizar la consulta o seleccionar otra cuenta.</Empty> : <>
          <div className={styles.legend} aria-label="Cómo interpretar la información"><span>Lectura de evidencia</span>{(Object.keys(EVIDENCE) as EvidenceKind[]).map((kind) => <Badge key={kind} kind={kind} />)}</div>
          {section === "applications" && <>
            <div className={styles.toolbar}><label className={`${styles.field} ${styles.searchField}`}>Buscar en {candidate ? "mis postulaciones" : "mi alcance"}<Search size={16} aria-hidden="true" /><input value={query} onChange={(event) => { setQuery(event.target.value); setLimit(12); }} placeholder="Cargo, empresa o identificador" /></label><label className={styles.field}>Mostrar<select value={filter} onChange={(event) => { setFilter(event.target.value as ApplicationFilter); setLimit(12); }}><option value="all">Todas las postulaciones</option><option value="stale">Sin actividad reciente</option><option value="communication">Comunicación por confirmar</option><option value="review">Revisión humana pendiente</option><option value="discrepancy">Estado y eventos diferentes</option></select></label></div>
            <div className={styles.split}><section ref={resultsRef} tabIndex={-1} className={styles.listSection} aria-label="Postulaciones visibles"><div className={styles.listHeading}><h2>{candidate ? "Mis postulaciones" : "Postulaciones asignadas"}</h2><span className={styles.count}>{applications.length}</span></div>{applications.length ? <><div className={styles.items}>{applications.slice(0, limit).map((item) => <button key={item.id} ref={selected?.id === item.id ? selectedRef : undefined} type="button" className={`${styles.item} ${selected?.id === item.id ? styles.itemSelected : ""}`} aria-pressed={selected?.id === item.id} onClick={() => chooseApplication(item.id)}><div className={styles.itemTop}><span>{item.id}</span><span>{item.companyId || "Empresa por confirmar"}</span></div><h3>{item.vacancyTitle}</h3><p>{candidate ? `Postulada el ${date(item.appliedAt)}` : `${item.candidateId || "Identidad no visible"} · ${item.vacancyId}`}</p><div className={styles.itemBottom}><strong>{item.state}</strong><ArrowRight size={15} aria-hidden="true" /></div><div className={styles.tags}><Badge kind={item.stateKind} />{item.stale && <Badge kind="stale" />}{item.requiresReview && <span className={`${styles.badge} ${styles.review}`}>Revisión pendiente</span>}</div></button>)}</div>{applications.length > limit && <div className={styles.listMore}><span>{Math.min(limit, applications.length)} de {applications.length}</span><button className={styles.textButton} type="button" onClick={() => setLimit((value) => value + 12)}>Ver más<ArrowDown size={14} aria-hidden="true" /></button></div>}</> : <Empty title="No hay postulaciones con este filtro">Prueba otra búsqueda. Sólo aparecen los registros dentro de tu alcance.</Empty>}</section><section ref={detailRef} tabIndex={-1} className={styles.detail} aria-label="Detalle de la postulación">{selected ? <ApplicationDetail key={`${accountId}-${selected.id}`} application={selected} candidate={!!candidate} technicalAdmin={data.account.role === "Administrador de plataforma"} busy={busy} onSubmit={submitAction} onBack={() => { const target = selectedRef.current || resultsRef.current; target?.focus({ preventScroll: true }); target?.scrollIntoView({ behavior: "auto", block: "start" }); }} /> : <Empty title="Selecciona una postulación">Aquí podrás revisar su estado, evidencia y siguiente paso.</Empty>}</section></div>
          </>}
          {section === "vacancies" && <>
            <div className={styles.toolbar}><label className={`${styles.field} ${styles.searchField}`}>Buscar vacantes<Search size={16} aria-hidden="true" /><input value={vacancyQuery} onChange={(event) => { setVacancyQuery(event.target.value); setVacancyLimit(12); }} placeholder="Cargo, familia, región o identificador" /></label><label className={styles.field}>Estado o vigencia<select value={vacancyFilter} onChange={(event) => { setVacancyFilter(event.target.value); setVacancyLimit(12); }}><option value="all">Todas las visibles</option><option value="Activa">Activas</option><option value="Pausada">Pausadas</option><option value="Cerrada">Cerradas</option><option value="expired">Activas con cierre vencido</option></select></label></div><div className={styles.panelHeading}><h2>{vacancies.length} vacantes en tu alcance</h2></div><div className={styles.vacancies}>{vacancies.slice(0, vacancyLimit).map((vacancy) => <article key={vacancy.id} className={styles.vacancy}><div><div className={styles.itemTop}><span>{vacancy.id} · {vacancy.companyId}</span><span className={`${styles.badge} ${styles.confirmed}`}>{vacancy.state}</span></div><h2>{vacancy.title}</h2><p>{vacancy.family} · {vacancy.region} · {vacancy.modality}</p></div><dl className={styles.facts}><div><dt>Renta publicada</dt><dd>{vacancy.salary || "Información no disponible"}</dd></div><div><dt>Fecha de cierre</dt><dd>{date(vacancy.closesAt)}</dd></div><div><dt>Publicación</dt><dd>{date(vacancy.publishedAt)}</dd></div>{!candidate && <div><dt>Responsable</dt><dd>{vacancy.recruiterId || "Información no disponible"}</dd></div>}</dl><div><h3>Requisitos esenciales</h3>{vacancy.requirements.length ? <ul>{vacancy.requirements.map((requirement, index) => <li key={`${vacancy.id}-${index}`}>{requirement}</li>)}</ul> : <p>Información no disponible. No significa que no existan requisitos.</p>}</div>{!!vacancy.signals.length && <Signals signals={vacancy.signals} />}<div className={styles.vacancyBottom}><p>{vacancy.expired ? "El cierre registrado está vencido. El estado no se cambia automáticamente." : vacancy.state === "Activa" ? "La disponibilidad corresponde al registro entregado para la prueba." : "No recibe nuevas postulaciones. Su historia se conserva."}</p><Actions key={`${accountId}-${vacancy.id}`} target={{ vacancy }} busy={busy} onSubmit={submitAction} /></div></article>)}</div>{!vacancies.length && <Empty title="Sin vacantes para este filtro">El catálogo respeta la visibilidad de la cuenta seleccionada.</Empty>}{vacancies.length > vacancyLimit && <div className={styles.listMore}><span>{Math.min(vacancyLimit, vacancies.length)} de {vacancies.length}</span><button type="button" className={styles.secondary} onClick={() => setVacancyLimit((value) => value + 12)}>Ver más vacantes<ArrowDown size={14} aria-hidden="true" /></button></div>}
          </>}
          {section === "attention" && <div className={styles.sectionStack}>
            <div className={styles.notice}><Info size={18} aria-hidden="true" /><p>Un campo vacío indica falta de evidencia. Las señales de esta vista no rechazan personas ni cambian etapas automáticamente.</p></div>
            {!!data.integrity.length && <section className={styles.panel}><h2>Integridad y trazabilidad</h2><p>Hallazgos disponibles para tu función y alcance.</p><Signals signals={data.integrity} /></section>}
            <section><div className={styles.panelHeading}><div><h2>{candidate ? "Mis procesos por confirmar" : "Casos que necesitan atención"}</h2><p>{attention.length} postulaciones visibles con al menos una señal.</p></div></div><div className={styles.alertRows}>{attention.slice(0, limit).map((item) => <article className={styles.alertRow} key={item.id}><TriangleAlert size={18} aria-hidden="true" /><div className={styles.alertContent}><div className={styles.itemTop}><span>{item.id} · {item.vacancyId}</span><span>{item.state}</span></div><h3>{item.vacancyTitle}</h3><div className={styles.tags}>{item.requiresReview && <span className={`${styles.badge} ${styles.review}`}>Revisión humana pendiente</span>}{item.stale && <Badge kind="stale" />}{item.discrepancy && <Badge kind="inferred">Inconsistencia por revisar</Badge>}{!item.communication.confirmed && <Badge kind="missing">Comunicación por confirmar</Badge>}</div><p>{item.nextStep}</p></div><button type="button" className={styles.secondary} onClick={() => openCase(item.id)}>Revisar caso<ArrowRight size={14} aria-hidden="true" /></button></article>)}</div>{!attention.length && <Empty title="No hay alertas en los registros visibles">Esto describe la evidencia disponible para esta cuenta, no garantiza que todos los procesos estén completos.</Empty>}{attention.length > limit && <div className={styles.listMore}><span>{limit} de {attention.length} casos</span><button type="button" className={styles.secondary} onClick={() => setLimit((value) => value + 12)}>Ver más casos</button></div>}</section>
            {!!data.requests.length && <section className={styles.panel}><h2>Solicitudes y seguimiento</h2><p>Las solicitudes pendientes no equivalen a una decisión ejecutada.</p><RequestList requests={data.requests} /></section>}
          </div>}
          {section === "metrics" && data.account.permissions.metrics && <div className={styles.sectionStack}><div className={styles.notice}><ShieldCheck size={18} aria-hidden="true" /><p><strong>Alcance de estos indicadores: </strong>{data.account.scope}. Referencia del cálculo: {date(data.asOf)}. Cada postulación se cuenta una vez por indicador; una misma postulación puede aparecer en varios.</p></div><div className={styles.metrics}>{data.metrics.map((metric) => <article key={metric.id} className={styles.metric}><h2>{metric.label}</h2><strong>{metric.value.toLocaleString("es-CL")}</strong><p>{metric.explanation}</p></article>)}</div><div className={styles.charts}><section className={styles.panel}><h2>Postulaciones por etapa</h2><p>Estado registrado en los procesos visibles.</p><div className={styles.chartRows}>{APPLICATION_STATES.map((state) => { const count = data.applications.filter((item) => item.state === state).length; return <div key={state} className={styles.chartRow}><span>{state}</span><div className={styles.track} aria-hidden="true"><div className={styles.bar} style={{ width: `${data.applications.length ? count / data.applications.length * 100 : 0}%` }} /></div><strong>{count}</strong></div>; })}</div></section><section className={styles.panel}><h2>Vacantes por estado</h2><p>El vencimiento se informa aparte; no cambia el estado.</p><div className={styles.chartRows}>{["Activa", "Pausada", "Cerrada"].map((state) => { const count = data.vacancies.filter((item) => item.state === state).length; return <div key={state} className={styles.chartRow}><span>{state}</span><div className={styles.track} aria-hidden="true"><div className={styles.bar} style={{ width: `${data.vacancies.length ? count / data.vacancies.length * 100 : 0}%` }} /></div><strong>{count}</strong></div>; })}</div></section></div></div>}
        </>}
        <footer className={styles.footer}><span>Skill path · Datos sintéticos de la Prueba 2</span><span>Estados verificables · Permisos por cuenta · Revisión humana</span></footer>
      </main>
    </div>
  </div>;
}
