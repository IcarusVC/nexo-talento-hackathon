import type { ReactNode } from "react";
import type { ProductActionPayload, ProductWorkspace } from "@/lib/skill-path-product/types";
import styles from "./workspace.module.css";

export type ProductPanelProps = { data: ProductWorkspace; busy: boolean; act: (payload: ProductActionPayload) => Promise<boolean>; mutationError?: string };
export const skills = (value: FormDataEntryValue | null) => [...new Set(String(value || "").split(/[,;\n]/).map(s => s.trim()).filter(Boolean))];
export const str = (form: FormData, name: string) => String(form.get(name) || "").trim();
export const number = (form: FormData, name: string) => Number(form.get(name));
export const safeUrl = (value: string | null | undefined) => { try { const url = new URL(value || ""); return ["http:", "https:"].includes(url.protocol) ? url.href : null; } catch { return null; } };
export const date = (value: string | null | undefined, time = false) => { if (!value) return "Por confirmar"; const d = new Date(value.length === 10 ? `${value}T12:00:00Z` : value); return Number.isNaN(d.getTime()) ? "Por confirmar" : new Intl.DateTimeFormat("es-CL", { dateStyle: "medium", ...(time ? { timeStyle: "short" as const } : {}), timeZone: "America/Santiago" }).format(d); };
export const currency = (value: number | null) => value === null ? "Precio por confirmar" : value === 0 ? "Sin costo en esta demo" : new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(value);
export const normalize = (value: string) => value.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) { return <label className={styles.field}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>; }
export function Tags({ values, tone = "neutral" }: { values: string[]; tone?: "neutral" | "good" | "pending" }) { return <div className={styles.tags}>{values.map(value => <span className={`${styles.tag} ${tone === "good" ? styles.good : tone === "pending" ? styles.pending : ""}`} key={value}>{value}</span>)}</div>; }
export function Empty({ title, children }: { title: string; children?: ReactNode }) { return <div className={styles.empty}><h3>{title}</h3>{children && <p>{children}</p>}</div>; }
export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) { return <div className={styles.sectionTitle}><h2>{title}</h2>{children && <p>{children}</p>}</div>; }
export function Metric({ value, label }: { value: string | number; label: string }) { return <div className={styles.metric}><strong>{value}</strong><span>{label}</span></div>; }
export function ExternalLink({ url, children }: { url: string | null; children: ReactNode }) { const href = safeUrl(url); return href ? <a href={href} target="_blank" rel="noopener noreferrer" className={styles.link}>{children}<span className={styles.srOnly}> (abre otra pestaña)</span></a> : null; }
export function SkillField({ label = "Habilidades", name = "skills", value = "", required = false }: { label?: string; name?: string; value?: string; required?: boolean }) { return <Field label={label} hint="Separa cada habilidad con una coma."><input name={name} defaultValue={value} placeholder="SQL, Python, Comunicación" maxLength={2000} required={required}/></Field>; }
