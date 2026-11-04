import { parseLukImport } from "./engine";
import type { Opportunity } from "./types";

// Official endpoint/schema: https://www.getonbrd.com/doc/openapi.yaml
// Salary semantics: https://www.getonbrd.com/help/must-the-salary-offered-be-public-or-can-it-be-confidential
// min_salary/max_salary alone do NOT identify monthly versus annual display.
type Obj = Record<string, unknown>;
const obj = (value: unknown): Obj => value && typeof value === "object" && !Array.isArray(value) ? value as Obj : {};
const text = (value: unknown) => typeof value === "string" ? value : "";
const relation = (value: unknown) => obj(obj(obj(value).data).attributes);
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const fold = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const positiveInteger = (value: unknown): number | null => typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;

function categoryField(value: unknown): Opportunity["field"] {
  // Exact published categories/translation equivalents only; neither title nor generic
  // teamwork/communication signals imply a professional field or a clinical qualification.
  const categories: Record<string, Opportunity["field"]> = {
    programacion: "computacion", programming: "computacion",
    "data science / analytics": "computacion", "ciencia de datos / analitica": "computacion",
    "machine learning / ai": "computacion", "machine learning / ia": "computacion",
    accounting: "contabilidad", contabilidad: "contabilidad",
    "accounting / auditing": "contabilidad", "contabilidad / auditoria": "contabilidad",
    business: "comercial", negocios: "comercial", "business development": "comercial", "desarrollo de negocios": "comercial",
  };
  return categories[fold(text(value)).trim().replace(/\s+/g, " ")] ?? "general";
}

export function publicText(value: unknown): string {
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", aacute: "á", eacute: "é", iacute: "í", oacute: "ó", uacute: "ú", ntilde: "ñ" };
  return text(value).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/?(?:p|li|ul|ol|div|br|h[1-6])\b[^>]*>/gi, "\n").replace(/<[^>]*>/g, " ")
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (full, key: string) => {
      if (!key.startsWith("#")) return entities[key.toLowerCase()] ?? full;
      const code = key[1].toLowerCase() === "x" ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : " ";
    }).replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
}

export function adaptGetOnBoard(payload: unknown, capturedAt: string) {
  const data = obj(payload).data;
  if (!Array.isArray(data)) throw new Error("La API no devolvió un listado de ofertas reconocible.");
  const meta = obj(obj(payload).meta);
  const page = positiveInteger(meta.page) ?? 1;
  const pageSize = positiveInteger(meta.per_page) ?? 30;
  const declaredTotalPages = positiveInteger(meta.total_pages) ?? (meta.total_pages === 0 && data.length === 0 ? 0 : null);
  const totalPages = declaredTotalPages !== null && (declaredTotalPages >= page || declaredTotalPages === 0) ? declaredTotalPages : null;
  const hasMore = totalPages === null ? null : totalPages > page;
  const received = Math.min(data.length, 30);
  const warnings: string[] = [];
  const opportunities: Opportunity[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  for (const raw of data.slice(0, 30)) {
    const item = obj(raw);
    const a = obj(item.attributes);
    const sourceUrl = text(obj(item.links).public_url);
    let source: URL;
    try { source = new URL(sourceUrl); }
    catch { warnings.push("Se omitió una oferta sin URL pública verificable."); continue; }
    if (source.protocol !== "https:" || !["www.getonbrd.com", "getonbrd.com"].includes(source.hostname) ||
      source.username || source.password || source.port || !source.pathname.startsWith("/jobs/") || !text(a.title).trim()) {
      warnings.push("Se omitió una oferta sin título y enlace público válidos de Get on Board."); continue;
    }
    // Normalize identity before counting. Tracking links are the same publication.
    source.hash = "";
    source.hostname = "www.getonbrd.com";
    source.pathname = source.pathname.replace(/\/+$/, "");
    for (const key of [...source.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) source.searchParams.delete(key);
    source.searchParams.sort();
    if (seen.has(source.href)) { duplicates++; continue; }
    const cities = list(obj(a.location_cities).data).map((city) => obj(obj(city).attributes))
      .map((city) => [text(city.name), text(city.country)].filter(Boolean).join(", ")).filter(Boolean);
    const countries = list(a.countries).filter((value): value is string => typeof value === "string");
    const country = countries.find((value) => fold(value) === "chile") || countries.filter((value) => !/remot/i.test(value)).join(", ");
    const modality = relation(a.modality);
    const seniority = relation(a.seniority);
    const remote: Record<string, string> = { no_remote: "Presencial", hybrid: "Híbrido", remote_local: "Remoto con restricciones territoriales", fully_remote: "Remoto global", remote: "Remoto" };
    const mode = remote[text(a.remote_modality)] || text(a.remote_modality);
    const schedule = [text(modality.name), mode].filter(Boolean).join(" · ");
    const location = cities.join(" · ") || [countries.join(", "), text(a.remote_zone)].filter(Boolean).join(" · ");
    const description = [publicText(a.description), publicText(a.functions),
      publicText(a.desirable).split("\n").filter(Boolean).map((line) => `Deseable: ${line}`).join("\n")].filter(Boolean).join("\n");
    const min = typeof a.min_salary === "number" && Number.isFinite(a.min_salary) && a.min_salary > 0 ? a.min_salary : null;
    const max = typeof a.max_salary === "number" && Number.isFinite(a.max_salary) && a.max_salary > 0 ? a.max_salary : null;
    const range = min !== null && max !== null ? max >= min ? `${min}–${max}` : "" : min !== null ? `desde ${min}` : max !== null ? `hasta ${max}` : "";
    if (min !== null && max !== null && max < min) warnings.push("Se omitió un rango salarial incoherente en la fuente.");
    // USD is documented by the provider; the response omits period and gross/net flags.
    // Keep the published range visible, but exclude it from numerical salary comparisons.
    const remuneration = range ? `USD ${range}; rango informado por Get on Board, período y bruto/líquido por confirmar` : "Remuneración no publicada";
    const date = typeof a.published_at === "number" && a.published_at > 0 && a.published_at < 253402300800 ? new Date(a.published_at * 1000).toISOString() : "";
    const levels: Record<string, Opportunity["seniority"]> = { junior: "entry", no_experience: "entry", semi_senior: "mid", senior: "senior", expert: "lead" };
    const parsed = parseLukImport(JSON.stringify({
      title: text(a.title), company: text(relation(a.company).name), url: source.href, country, location, field: categoryField(a.category_name),
      captured_at: capturedAt, published_at: date, description, workday: schedule,
      employment_type: text(modality.locale_key), remuneration, modality: mode,
      seniority: levels[text(seniority.locale_key)] || "unspecified",
      limits: ["Fuente: API pública oficial de Get on Board; requisitos extraídos por reglas y pendientes de revisión.",
        `Categoría publicada: ${text(a.category_name) || "no indicada"}.`,
        ...(date ? [`Publicación declarada: ${date}.`] : []),
        ...(range ? ["La respuesta API no identifica el período del rango salarial ni si hubo conversión o redondeo. No se convirtió a CLP ni se incluyó en comparaciones numéricas."] : []),
        ...(!country ? ["El filtro country_code=cl es alcance de búsqueda; una oferta remota no confirma elegibilidad desde Chile."] : [])],
    }));
    if (!parsed.opportunities[0]) { warnings.push("Se omitió una oferta que no pudo normalizarse."); continue; }
    seen.add(source.href);
    const offer = parsed.opportunities[0];
    opportunities.push({ ...offer, id: offer.id.replace(/^luk-/, "getonboard-"), field: categoryField(a.category_name),
      scheduleText: schedule || offer.scheduleText, limits: [...new Set(offer.limits)] });
  }
  if (data.length && !opportunities.length) throw new Error("Ninguna oferta incluyó título y URL pública verificables.");
  return { opportunities, warnings: [...new Set(warnings)], captured: opportunities.length,
    enriched: opportunities.filter((offer) => offer.description.length > 0).length,
    coverage: { page, pageSize, totalPages, hasMore, limitReached: hasMore === true || data.length >= 30,
      received, unique: opportunities.length, matched: opportunities.length, duplicates,
      omitted: received - opportunities.length - duplicates, locationFilter: "none" as "none" | "text_on_page" } };
}
