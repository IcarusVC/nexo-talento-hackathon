import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { parseLukImport } from "./engine";
import { adaptGetOnBoard } from "./getonboard-adapter";
import type { Opportunity } from "./types";

const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 90_000;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;

export interface SearchInput { query: string; location: string; }
export interface SearchResponse {
  opportunities: Opportunity[];
  capturedAt: string;
  query: string;
  location: string;
  source: "Luk" | "Get on Board";
  cacheHit: boolean;
  stats: { captured: number; enriched: number };
  warnings: string[];
  coverage?: {
    page: number; pageSize: number; totalPages: number | null; hasMore: boolean | null; limitReached: boolean;
    received: number; unique: number; matched: number; duplicates: number; omitted: number;
    locationFilter: "none" | "text_on_page";
  };
}

export class SearchError extends Error {
  constructor(public code: string, message: string, public status = 503, public retryAfterSeconds?: number) { super(message); }
}

export function validateSearchInput(input: unknown): SearchInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new SearchError("INVALID_INPUT", "Envía una búsqueda en formato JSON.", 400);
  }
  const value = input as Record<string, unknown>;
  for (const key of ["query", "location"] as const) {
    if (value[key] !== undefined && typeof value[key] !== "string") {
      throw new SearchError("INVALID_INPUT", "El cargo y la ubicación deben ser texto.", 400);
    }
  }
  if (Object.keys(value).some((key) => !["query", "location"].includes(key))) {
    throw new SearchError("INVALID_INPUT", "Esta búsqueda admite cargo y ubicación; su alcance es Chile.", 400);
  }
  const query = ((value.query as string | undefined) ?? "").trim().replace(/\s+/g, " ");
  const location = ((value.location as string | undefined) ?? "").trim().replace(/\s+/g, " ");
  if (query.length > 150 || location.length > 100 || /[\u0000-\u001f\u007f]/.test(query + location)) {
    throw new SearchError("INVALID_INPUT", "Usa hasta 150 caracteres para cargos y 100 para ubicación, sin caracteres de control.", 400);
  }
  return { query, location };
}

interface ProcessResult { code: number | null; stdout: string; stderr: string; }
type Runner = (query: string) => Promise<ProcessResult>;

/** Paths and options are controlled by the server; user text is only one argv value. */
export function searchProcessCommand(query: string, root = process.cwd()) {
  const localPython = path.join(root, ".venv-luk", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
  const configuredPython = process.env.NEXO_PYTHON;
  const python = existsSync(localPython) ? localPython : configuredPython || "python3";
  const script = path.join(root, "tools", "luk", "nexo-search.py");
  if (!existsSync(script)) {
    throw new SearchError("NOT_INSTALLED", "Falta el conector local de Luk. Abre la copia completa del repositorio para habilitar la búsqueda.");
  }
  return { python, args: ["-I", "-X", "utf8", script, `--query=${query}`], root };
}

export const runSearchProcess: Runner = async (query) => {
  const command = searchProcessCommand(query);
  return new Promise((resolve, reject) => {
    // No shell, inherited login/cookie settings, or user-controlled executable/options.
    const env: NodeJS.ProcessEnv = { NODE_ENV: process.env.NODE_ENV };
    for (const key of ["PATH", "Path", "SystemRoot", "SYSTEMROOT", "WINDIR", "TEMP", "TMP", "TMPDIR", "LANG"]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    const child = spawn(command.python, command.args, {
      cwd: command.root, shell: false, windowsHide: true, env, stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let bytes = 0;
    let errorBytes = 0;
    let failure: SearchError | undefined;
    const timer = setTimeout(() => {
      failure = new SearchError("TIMEOUT", "La consulta superó 90 segundos. La captura se detuvo; intenta más tarde.", 504);
      child.kill();
    }, TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > MAX_OUTPUT_BYTES) {
        failure = new SearchError("OUTPUT_LIMIT", "La respuesta del portal supera el límite de esta demo; la captura se detuvo.");
        child.kill();
      } else stdout.push(chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      errorBytes += chunk.length;
      if (errorBytes <= 16_384) stderr.push(chunk);
    });
    child.once("error", () => {
      clearTimeout(timer);
      reject(new SearchError("NOT_INSTALLED", "No se pudo iniciar Python. El equipo debe instalar Luk en .venv-luk para habilitar este botón; no necesitas una cuenta ni credenciales."));
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (failure) reject(failure);
      else resolve({ code, stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8") });
    });
  });
};

const fold = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
interface CacheEntry { at: number; data: SearchResponse; }

export function createSearchService(run: Runner = runSearchProcess, now: () => number = Date.now) {
  const cache = new Map<string, CacheEntry>();
  let busy = false;
  let stopped = false;
  let finishedAt = -Infinity;
  return async (input: SearchInput): Promise<SearchResponse> => {
    // Location is a local descriptive filter, so changing it reuses the same public capture.
    const key = fold(input.query);
    let entry = cache.get(key);
    let cacheHit = Boolean(entry && now() - entry.at < TTL_MS);
    if (!cacheHit) {
      entry = undefined;
      if (stopped) throw new SearchError("SOURCE_BLOCKED", "Luk solicitó detener las consultas. La búsqueda queda suspendida; no se reintentará automáticamente.");
      if (busy) throw new SearchError("BUSY", "Ya hay una consulta en curso. Espera a que termine antes de iniciar otra.", 429);
      if (now() - finishedAt < 2000) throw new SearchError("BUSY", "Espera unos segundos entre búsquedas para respetar la pausa del portal.", 429);
      busy = true;
      try {
        const result = await run(input.query);
        if (result.code === 2) {
          stopped = true;
          throw new SearchError("SOURCE_BLOCKED", "Luk rechazó la consulta o sus reglas impiden continuar. Se detuvieron las solicitudes.");
        }
        if (/ModuleNotFoundError|No module named|ImportError/.test(result.stderr)) {
          throw new SearchError("NOT_INSTALLED", "El conector de Luk aún no está instalado en Python. El equipo debe completar la instalación local en .venv-luk; no se requieren cuentas ni claves.");
        }
        if (result.code !== 0) {
          throw new SearchError("SOURCE_UNAVAILABLE", "No se pudo leer el portal público de Luk. Puede estar temporalmente inaccesible o haber cambiado su formato. No se reemplazaron los resultados por datos de ejemplo.");
        }
        let raw: { results?: unknown; captured_at?: unknown; stats?: { captured?: unknown; enriched?: unknown }; warnings?: unknown };
        try { raw = JSON.parse(result.stdout); }
        catch { throw new SearchError("INVALID_RESPONSE", "El conector no entregó una respuesta válida. No se generaron ofertas de reemplazo."); }
        if (!raw || !Array.isArray(raw.results) || typeof raw.captured_at !== "string" || !Number.isFinite(Date.parse(raw.captured_at))) {
          throw new SearchError("INVALID_RESPONSE", "Faltan los resultados o la fecha de captura del portal.");
        }
        const parsed = parseLukImport(JSON.stringify(raw.results));
        if (raw.results.length && !parsed.opportunities.length) {
          throw new SearchError("INVALID_RESPONSE", "Las ofertas capturadas no aportan título y fuente verificables.");
        }
        const enriched = typeof raw.stats?.enriched === "number" && Number.isInteger(raw.stats.enriched) && raw.stats.enriched >= 0 ? Math.min(8, raw.stats.enriched) : 0;
        const warnings = [
          "Búsqueda pública de cargos en Chile, limitada a las primeras 2 páginas y hasta 8 detalles. No representa todo el mercado.",
          "La captura no confirma que la vacante siga disponible; revisa su fuente antes de postular.",
          ...(Array.isArray(raw.warnings) ? raw.warnings.filter((v): v is string => typeof v === "string") : []),
          ...parsed.warnings.filter((warning) => !warning.startsWith("Archivo importado localmente.")),
          ...parsed.errors.map((error) => `Registro omitido: ${error}`),
        ];
        const data: SearchResponse = {
          opportunities: parsed.opportunities, capturedAt: raw.captured_at, query: input.query, location: "", source: "Luk", cacheHit: false,
          stats: { captured: raw.results.length, enriched }, warnings,
        };
        entry = { at: now(), data };
        for (const [cachedKey, item] of cache) if (now() - item.at >= TTL_MS) cache.delete(cachedKey);
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(key, entry);
      } finally { busy = false; finishedAt = now(); }
      cacheHit = false;
    }
    const data = entry!.data;
    const location = fold(input.location);
    const opportunities = location && location !== "chile" ? data.opportunities.filter((offer) =>
      location.split(/\s+/).every((word) => fold(`${offer.location} ${offer.country}`).includes(word))) : data.opportunities;
    return {
      ...data, query: input.query, location: input.location, opportunities, cacheHit,
      warnings: [...data.warnings, ...(location ? ["La ubicación se filtra por texto en las ofertas capturadas de Chile; no es una búsqueda geográfica completa del portal."] : [])],
    };
  };
}

// Survives Next development reloads: one child process at a time and a shared 10-minute cache.
const globalSearch = globalThis as typeof globalThis & { __nexoLukSearch?: ReturnType<typeof createSearchService> };
export const searchLuk = globalSearch.__nexoLukSearch ??= createSearchService();

/** Independent public API provider; never retries or falls back to the stopped Luk source. */
export function createPublicSearchService(fetcher: typeof fetch = fetch, now: () => number = Date.now) {
  const cache = new Map<string, CacheEntry>();
  let busy = false;
  let finishedAt = -Infinity;
  let retryAt = 0;
  let accessBlocked = false;
  return async (input: SearchInput): Promise<SearchResponse> => {
    const key = fold(input.query);
    let entry = cache.get(key);
    const cacheHit = Boolean(entry && now() - entry.at < TTL_MS);
    if (!cacheHit) {
      if (accessBlocked) throw new SearchError("ACCESS_BLOCKED", "Get on Board rechazó el acceso. La fuente quedó detenida y requiere revisión del equipo antes de nuevas consultas.");
      if (now() < retryAt) throw new SearchError("RATE_LIMITED", "Get on Board mantiene una pausa de consultas. Conservamos los resultados anteriores.", 429, Math.max(1, Math.ceil((retryAt - now()) / 1000)));
      if (busy) throw new SearchError("BUSY", "Ya hay una consulta al portal en curso. Espera a que termine.", 429);
      if (now() - finishedAt < 2000) throw new SearchError("BUSY", "Espera antes de iniciar otra consulta al portal.", 429, Math.max(1, Math.ceil((2000 - (now() - finishedAt)) / 1000)));
      busy = true;
      try {
        const url = new URL("https://www.getonbrd.com/api/v0/search/jobs");
        url.searchParams.set("query", input.query);
        url.searchParams.set("country_code", "cl");
        url.searchParams.set("per_page", "30");
        url.searchParams.set("page", "1");
        url.searchParams.set("lang", "es");
        for (const field of ["company", "location_cities", "seniority", "modality"]) url.searchParams.append("expand[]", field);
        let response: Response;
        try {
          response = await fetcher(url, { method: "GET", headers: { Accept: "application/json", "User-Agent": "NexoTalento/0.2 public-jobs-demo" },
            redirect: "error", credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(15_000) });
        } catch (error) {
          if (error instanceof Error && /Abort|Timeout/.test(error.name)) throw new SearchError("TIMEOUT", "Get on Board tardó demasiado en responder. No se generaron resultados de reemplazo.", 504);
          throw new SearchError("SOURCE_UNAVAILABLE", "No se pudo conectar con la API pública de Get on Board. Intenta más tarde.");
        }
        if (response.status === 403) {
          accessBlocked = true;
          throw new SearchError("ACCESS_BLOCKED", "Get on Board rechazó el acceso. Se detuvo la fuente; no se reintentará sin revisión del equipo.");
        }
        if (response.status === 429) {
          const retryHeader = response.headers.get("retry-after") || "";
          const seconds = Number(retryHeader);
          const wait = /^\d+$/.test(retryHeader) && Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryHeader) - now();
          retryAt = now() + Math.max(TTL_MS, Number.isFinite(wait) ? wait : 0);
          throw new SearchError("RATE_LIMITED", "Get on Board pidió una pausa de consultas. Se respetó la espera y no se reintentó.", 429, Math.max(1, Math.ceil((retryAt - now()) / 1000)));
        }
        if (!response.ok || !response.headers.get("content-type")?.includes("json")) throw new SearchError("SOURCE_UNAVAILABLE", "Get on Board no devolvió una respuesta pública válida.");
        const reader = response.body?.getReader();
        if (!reader) throw new SearchError("INVALID_RESPONSE", "La respuesta de Get on Board está vacía.");
        const chunks: Uint8Array[] = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > MAX_OUTPUT_BYTES) { await reader.cancel(); throw new SearchError("OUTPUT_LIMIT", "La respuesta supera el límite de esta demo."); }
            chunks.push(value);
          }
        } catch (error) {
          if (error instanceof SearchError) throw error;
          if (error instanceof Error && /Abort|Timeout/.test(error.name)) throw new SearchError("TIMEOUT", "La lectura de Get on Board superó el tiempo permitido. No se generaron resultados de reemplazo.", 504);
          throw new SearchError("SOURCE_UNAVAILABLE", "Se interrumpió la respuesta de Get on Board. Conservamos los resultados anteriores.");
        } finally { reader.releaseLock(); }
        let raw: unknown;
        try { raw = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
        catch { throw new SearchError("INVALID_RESPONSE", "Get on Board no entregó un listado JSON válido."); }
        const capturedAt = new Date(now()).toISOString();
        let adapted: ReturnType<typeof adaptGetOnBoard>;
        try { adapted = adaptGetOnBoard(raw, capturedAt); }
        catch { throw new SearchError("INVALID_RESPONSE", "Las ofertas de Get on Board no tienen el formato público esperado."); }
        const data: SearchResponse = { opportunities: adapted.opportunities, capturedAt, query: input.query, location: "", source: "Get on Board", cacheHit: false,
          stats: { captured: adapted.captured, enriched: adapted.enriched }, coverage: adapted.coverage, warnings: [
            "Fuente: API pública oficial de Get on Board; búsqueda de texto con country_code=cl. Hasta 30 resultados de la primera página.",
            "Esta fuente se concentra en empleos tecnológicos y áreas relacionadas; no representa todas las carreras ni todo el mercado chileno.",
            "La aparición en el portal no confirma contratación ni elegibilidad desde Chile. Revisa requisitos y condiciones en la fuente.",
            "Los rangos salariales sin período explícito permanecen fuera de las comparaciones numéricas; no se realizó conversión monetaria.",
            ...(adapted.coverage.hasMore ? [`El portal declara ${adapted.coverage.totalPages} páginas; sólo se consultó la primera.`] : []),
            ...(adapted.coverage.hasMore === null ? ["El portal no aportó un total de páginas verificable; la captura no permite afirmar que se revisaron todos los resultados."] : []),
            ...(adapted.coverage.duplicates ? [`Se unificaron ${adapted.coverage.duplicates} registros duplicados antes de contar las ofertas.`] : []),
            ...adapted.warnings,
          ] };
        entry = { at: now(), data };
        for (const [cachedKey, item] of cache) if (now() - item.at >= TTL_MS) cache.delete(cachedKey);
        if (cache.size >= 32) cache.delete(cache.keys().next().value!);
        cache.set(key, entry);
      } finally { busy = false; finishedAt = now(); }
    }
    const data = entry!.data;
    const location = fold(input.location);
    const opportunities = location && location !== "chile" ? data.opportunities.filter((offer) =>
      location.split(/\s+/).every((word) => fold(`${offer.location} ${offer.country}`).includes(word))) : data.opportunities;
    return { ...data, opportunities, query: input.query, location: input.location, cacheHit,
      ...(data.coverage ? { coverage: { ...data.coverage, matched: opportunities.length, locationFilter: location && location !== "chile" ? "text_on_page" as const : "none" as const } } : {}),
      warnings: [...data.warnings, ...(location && location !== "chile" ? ["La ciudad o región se filtra por texto en esta página de resultados; no equivale a una búsqueda geográfica exhaustiva."] : [])] };
  };
}

const globalPublicSearch = globalThis as typeof globalThis & { __nexoGetOnBoardSearch?: ReturnType<typeof createPublicSearchService> };
export const searchJobs = globalPublicSearch.__nexoGetOnBoardSearch ??= createPublicSearchService();
