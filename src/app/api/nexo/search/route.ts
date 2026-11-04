import { SearchError, searchJobs, validateSearchInput } from "@/lib/nexo/search-server";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
const localAuthority = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[1-9]\d{0,4})?$/i;

export async function POST(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    // Next builds request.url from its listening hostname (e.g. localhost), even when the
    // browser accessed 127.0.0.1. Host is the browser's authority; forwarded hosts are ignored.
    // Validate it before parsing, and still require an explicit exact Origin (including port).
    const host = request.headers.get("host") ?? url.host;
    let effectiveOrigin = "";
    if (localAuthority.test(host) && ["http:", "https:"].includes(url.protocol)) {
      try { effectiveOrigin = new URL(`${url.protocol}//${host}`).origin; }
      catch { /* An invalid port/authority remains denied. */ }
    }
    if (!localHosts.has(url.hostname) || !effectiveOrigin || origin !== effectiveOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
      throw new SearchError("LOCAL_ONLY", "Esta demo acepta búsquedas sólo desde su propia página local.", 403);
    }
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
      throw new SearchError("INVALID_INPUT", "Envía la búsqueda como JSON.", 415);
    }
    const reader = request.body?.getReader();
    if (!reader) throw new SearchError("INVALID_INPUT", "Falta el cargo o la búsqueda.", 400);
    const decoder = new TextDecoder();
    let size = 0;
    let text = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2048) {
          await reader.cancel();
          throw new SearchError("INVALID_INPUT", "La solicitud supera el tamaño permitido.", 413);
        }
        text += decoder.decode(value, { stream: true });
      }
      text += decoder.decode();
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(text); }
    catch { throw new SearchError("INVALID_INPUT", "La búsqueda no contiene JSON válido.", 400); }
    const result = await searchJobs(validateSearchInput(body));
    return Response.json(result, { headers });
  } catch (error) {
    const known = error instanceof SearchError;
    const retryAfterSeconds = known && Number.isFinite(error.retryAfterSeconds) && (error.retryAfterSeconds ?? 0) > 0 ? Math.ceil(error.retryAfterSeconds!) : undefined;
    return Response.json({
      error: known ? error.message : "La consulta no pudo completarse. Intenta más tarde.",
      code: known ? error.code : "SEARCH_ERROR",
      ...(retryAfterSeconds !== undefined ? { retryAfterSeconds } : {}),
    }, { status: known ? error.status : 503, headers: { ...headers, ...(retryAfterSeconds !== undefined ? { "Retry-After": String(retryAfterSeconds) } : {}) } });
  }
}
