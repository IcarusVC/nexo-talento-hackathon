"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Award, BookOpen, BriefcaseBusiness, ChartNoAxesCombined, ClipboardCheck, GraduationCap, Layers3, ListChecks, PlusCircle, RefreshCw, ShieldCheck, Target, UserRound, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductAccount, ProductActionPayload, ProductActionResult, ProductRole, ProductWorkspace } from "@/lib/skill-path-product/types";
import { CandidateApplicationsPanel, CandidateProfilePanel, GoalPanel, OpportunitiesPanel } from "./candidate";
import { AccreditationsPanel, CompanySkillsPanel, CreateJobPanel, FunnelPanel, TeamPanel } from "./recruitment";
import { CatalogPanel, DemandPanel, ParticipantsPanel } from "./institution";
import styles from "./workspace.module.css";

type Tab = "profile"|"opportunities"|"goal"|"applications"|"funnel"|"publish"|"accreditations"|"team"|"company-skills"|"catalog"|"demand"|"participants";
const roleNames:Record<ProductRole,string>={candidate:"Candidato",recruiter:"Reclutador",supervisor:"Supervisor de reclutamiento",institution:"Institución de formación"};
const menus:Record<ProductRole,{id:Tab;label:string;icon:LucideIcon}[]>={
  candidate:[{id:"profile",label:"Mi perfil",icon:UserRound},{id:"opportunities",label:"Oportunidades",icon:BriefcaseBusiness},{id:"goal",label:"Mi meta y formación",icon:Target},{id:"applications",label:"Mis postulaciones",icon:ListChecks}],
  recruiter:[{id:"funnel",label:"Embudo de selección",icon:Layers3},{id:"publish",label:"Publicar vacante",icon:PlusCircle},{id:"accreditations",label:"Acreditaciones",icon:Award}],
  supervisor:[{id:"team",label:"Mi equipo",icon:UsersRound},{id:"funnel",label:"Embudo de selección",icon:Layers3},{id:"publish",label:"Publicar vacante",icon:PlusCircle},{id:"accreditations",label:"Acreditaciones",icon:Award},{id:"company-skills",label:"Habilidades de empresa",icon:ClipboardCheck}],
  institution:[{id:"catalog",label:"Mi catálogo",icon:BookOpen},{id:"demand",label:"Demanda de habilidades",icon:ChartNoAxesCombined},{id:"participants",label:"Participantes",icon:GraduationCap}]
};
const copy:Record<Tab,{title:string;description:string}>={
  profile:{title:"Tu talento, con evidencia.",description:"Haz visible lo que sabes, respalda lo que has hecho y construye tu próximo paso profesional."},
  opportunities:{title:"Encuentra dónde aportar.",description:"Compara los requisitos con tus habilidades y elige oportunidades que tengan sentido para ti."},
  goal:{title:"De tu meta al siguiente paso.",description:"Conecta lo que necesitas demostrar con formación, proyectos y experiencias prácticas."},
  applications:{title:"Cada postulación, en contexto.",description:"Consulta tu etapa actual y las decisiones que forman parte de su historia."},
  funnel:{title:"Un proceso claro, de principio a fin.",description:"Acompaña a cada candidato por las etapas y deja un próximo paso comprensible."},
  publish:{title:"La oportunidad empieza contigo.",description:"Publica el cargo con habilidades explícitas, condiciones y un responsable de seguimiento."},
  accreditations:{title:"Da valor a la experiencia demostrada.",description:"Revisa las experiencias dirigidas a tu empresa y registra el fundamento de cada acreditación."},
  team:{title:"Tu equipo, con perspectiva.",description:"Observa la carga de cada reclutador y los procesos que todavía necesitan atención."},
  "company-skills":{title:"Define las capacidades que necesitas.",description:"Conecta la base de habilidades de tu empresa con los requisitos que publican sus vacantes."},
  catalog:{title:"Formación que abre el próximo paso.",description:"Gestiona cursos, certificaciones y experiencias que ayuden a demostrar habilidades."},
  demand:{title:"Escucha lo que las empresas necesitan.",description:"Revisa las habilidades observadas en la muestra y encuentra dónde enfocar tu oferta formativa."},
  participants:{title:"Acompaña el aprendizaje hasta la evidencia.",description:"Revisa solicitudes y evalúa qué habilidades logró demostrar cada participante."}
};

export function SkillPathProduct() {
  const [accounts,setAccounts]=useState<ProductAccount[]>([]);
  const [accountId,setAccountId]=useState("");
  const [data,setData]=useState<ProductWorkspace|null>(null);
  const [tab,setTab]=useState<Tab>("profile");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [refresh,setRefresh]=useState(0);
  const heading=useRef<HTMLHeadingElement>(null);
  const mutationLock=useRef(false);
  const retryKey=useRef<{fingerprint:string;key:string}|null>(null);
  const accountRef=useRef("");
  useEffect(()=>{let active=true;const controller=new AbortController();(async()=>{try{const response=await fetch("/api/skill-path-product/accounts",{cache:"no-store",signal:controller.signal});if(!response.ok)throw new Error("No pudimos cargar las cuentas de demostración.");const rows:ProductAccount[]=await response.json();if(!active)return;setAccounts(rows);let stored="";try{stored=localStorage.getItem("skill-path-product-account") || "";}catch{}const initial=rows.find(a=>a.id===stored) || rows[0];if(!initial)throw new Error("No hay cuentas de demostración disponibles.");accountRef.current=initial.id;setAccountId(initial.id);let savedTab="";try{savedTab=localStorage.getItem(`skill-path-product-tab-${initial.id}`)||"";}catch{}setTab(menus[initial.role].some(t=>t.id===savedTab)?savedTab as Tab:menus[initial.role][0].id);}catch(cause){if(active&&!controller.signal.aborted){setError(cause instanceof Error?cause.message:"No pudimos cargar las cuentas.");setLoading(false);}}})();return()=>{active=false;controller.abort();};},[]);
  useEffect(()=>{if(!accountId)return;let active=true;const controller=new AbortController();(async()=>{try{const response=await fetch(`/api/skill-path-product/workspace?accountId=${encodeURIComponent(accountId)}`,{cache:"no-store",signal:controller.signal});const result=await response.json();if(!response.ok)throw new Error(result.error || "No pudimos cargar tu espacio.");if(active&&accountRef.current===accountId){setData(result);setLoading(false);}}catch(cause){if(active&&!controller.signal.aborted){setError(cause instanceof Error?cause.message:"No pudimos cargar tu espacio.");setLoading(false);}}})();return()=>{active=false;controller.abort();};},[accountId,refresh]);
  function switchAccount(id:string){if(busy)return;const account=accounts.find(a=>a.id===id);if(!account)return;accountRef.current=id;setData(null);setLoading(true);setError("");setMessage("");retryKey.current=null;setAccountId(id);let saved="";try{localStorage.setItem("skill-path-product-account",id);saved=localStorage.getItem(`skill-path-product-tab-${id}`)||"";}catch{}setTab(menus[account.role].some(t=>t.id===saved)?saved as Tab:menus[account.role][0].id);}
  function selectTab(next:Tab){setTab(next);setError("");setMessage("");try{localStorage.setItem(`skill-path-product-tab-${accountId}`,next);}catch{}requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}
  async function act(payload:ProductActionPayload):Promise<boolean>{
    if(!data||mutationLock.current)return false;mutationLock.current=true;setBusy(true);setError("");setMessage("");
    const fingerprint=JSON.stringify({accountId,payload});if(retryKey.current?.fingerprint!==fingerprint)retryKey.current={fingerprint,key:crypto.randomUUID()};
    let committed=false;
    try {
      const response=await fetch("/api/skill-path-product/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accountId,expectedVersion:data.version,idempotencyKey:retryKey.current.key,payload})});
      const result:ProductActionResult & {error?:string;code?:string}=await response.json();
      if(!response.ok){
        if(result.code==="VERSION_CONFLICT"){setRefresh(v=>v+1);throw new Error("La información cambió en otra vista. Estamos actualizando el espacio; revisa el formulario antes de volver a guardar.");}
        throw new Error(result.error||"No pudimos guardar el cambio.");
      }
      committed=true;retryKey.current=null;setMessage(result.message);
      const updated=await fetch(`/api/skill-path-product/workspace?accountId=${encodeURIComponent(accountId)}`,{cache:"no-store"});
      if(updated.ok)setData(await updated.json());
      else{setRefresh(v=>v+1);setMessage(`${result.message} Actualiza la vista para consultar el resultado.`);}
      return true;
    }catch(cause){
      if(committed){setMessage("El cambio quedó guardado. Actualiza la vista para consultar su resultado.");setRefresh(v=>v+1);return true;}
      setError(cause instanceof Error?cause.message:"No pudimos comunicarnos con el servidor.");return false;
    }finally{mutationLock.current=false;setBusy(false);}
  }
  const account=data?.account || accounts.find(a=>a.id===accountId);
  const menu=account?menus[account.role]:[];
  const current=copy[tab];
  const panelProps={data:data as ProductWorkspace,busy,act,mutationError:error};
  return <div className={styles.app}><a className={styles.skip} href="#product-main">Saltar al contenido</a><header className={styles.header}><a className={styles.brand} href="/skill-path/producto"><span className={styles.brandIcon}><ArrowUpRight size={27} aria-hidden="true"/></span><span><strong>Skill path</strong><small>Talento que puede demostrarlo.</small></span></a><label className={styles.account}><span>Cuenta de prueba</span><select aria-label="Elegir cuenta y perfil de demostración" value={accountId} onChange={e=>switchAccount(e.target.value)} disabled={busy||!accounts.length}>{!accounts.length && <option>Cargando cuentas…</option>}{Object.entries(roleNames).map(([role,label])=><optgroup key={role} label={label}>{accounts.filter(a=>a.role===role).map(a=><option key={a.id} value={a.id}>{a.name} · {a.id}</option>)}</optgroup>)}</select></label></header><div className={styles.shell}><aside className={styles.sidebar}><div className={styles.role}><span className={styles.eyebrow}>Tu espacio</span><strong>{account?roleNames[account.role]:"Skill path"}</strong><small>{account?.name}<br/>{account?.email}<br/>{account?.companyId ? data?.companies.find(c=>c.id===account.companyId)?.name : account?.institutionId ? data?.institutions.find(i=>i.id===account.institutionId)?.name : "Solo tus datos y postulaciones"}</small></div><nav className={styles.nav} aria-label="Secciones de tu perfil">{menu.map(item=>{const Icon=item.icon;return <button key={item.id} type="button" className={tab===item.id?styles.active:""} onClick={()=>selectTab(item.id)} aria-current={tab===item.id?"page":undefined} disabled={busy}><Icon size={17} aria-hidden="true"/>{item.label}</button>;})}</nav><div className={styles.sideFoot}><ShieldCheck size={18} aria-hidden="true"/><p>Las evidencias y decisiones conservan su fuente y revisión.</p><a href="/skill-path/brief">Abrir seguimiento del brief</a></div></aside><main id="product-main" className={styles.main}><div className={styles.demo}><ShieldCheck size={15} aria-hidden="true"/><p><strong>Demostración con datos ficticios.</strong> Empresas, cuentas, convenios con Platzi y U. de Chile, descuentos y actividades son simulados. Las solicitudes quedan dentro de esta demo.</p></div><div className={styles.hero}><div><p className={styles.eyebrow}>{account?roleNames[account.role]:"Skill path"} / {menu.find(m=>m.id===tab)?.label || "Tu espacio"}</p><h1 ref={heading} tabIndex={-1}>{current.title}</h1><p>{current.description}</p></div><button className={`${styles.secondary} ${styles.refresh}`} onClick={()=>{setError("");setLoading(true);setRefresh(v=>v+1);}} disabled={busy||loading||!accountId} aria-label="Actualizar información"><RefreshCw size={15} aria-hidden="true"/><span>Actualizar</span></button></div>{message && <div className={styles.notice} role="status">{message}</div>}{error && <div className={`${styles.notice} ${styles.error}`} role="alert">{error}</div>}{loading && <p className={styles.hint} role="status">Cargando tu espacio y sus permisos…</p>}{!loading&&data&&<div key={`${accountId}-${tab}`}>{tab==="profile"&&<CandidateProfilePanel {...panelProps}/ >}{tab==="opportunities"&&<OpportunitiesPanel {...panelProps} onGoal={()=>selectTab("goal")}/ >}{tab==="goal"&&<GoalPanel {...panelProps}/ >}{tab==="applications"&&<CandidateApplicationsPanel {...panelProps}/ >}{tab==="funnel"&&<FunnelPanel {...panelProps}/ >}{tab==="publish"&&<CreateJobPanel {...panelProps}/ >}{tab==="accreditations"&&<AccreditationsPanel {...panelProps}/ >}{tab==="team"&&<TeamPanel {...panelProps}/ >}{tab==="company-skills"&&<CompanySkillsPanel {...panelProps}/ >}{tab==="catalog"&&<CatalogPanel {...panelProps}/ >}{tab==="demand"&&<DemandPanel {...panelProps}/ >}{tab==="participants"&&<ParticipantsPanel {...panelProps}/ >}</div>}</main></div></div>;
}
