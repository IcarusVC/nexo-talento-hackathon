import { SkillPathError } from "./engine";
export const privateHeaders = { "Cache-Control": "no-store", "Vary": "Origin" };
export function apiError(error: unknown): Response {
  const known = error instanceof SkillPathError;
  return Response.json({ error: known ? error.message : "No se pudo completar la operación. Los datos originales se conservan.", code: known ? error.code : "SERVICE_ERROR" }, { status: known ? error.status : 503, headers: privateHeaders });
}
export async function readActionBody(request: Request): Promise<unknown> {
  const url = new URL(request.url); const host = request.headers.get("host") ?? url.host;
  let origin = ""; try { if (/^[a-zA-Z0-9.\-\[\]:]+$/.test(host)) origin = new URL(`${url.protocol}//${host}`).origin; } catch { /* Invalid host is rejected. */ }
  if (!origin || request.headers.get("origin") !== origin || request.headers.get("sec-fetch-site") === "cross-site") throw new SkillPathError("SAME_ORIGIN_REQUIRED", "Realiza la acción desde la página de Skill path.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new SkillPathError("JSON_REQUIRED", "La solicitud debe usar JSON.", 415);
  const reader = request.body?.getReader(); if (!reader) throw new SkillPathError("INVALID_JSON", "La solicitud está vacía.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 8192) { await reader.cancel(); throw new SkillPathError("BODY_TOO_LARGE", "La solicitud supera el tamaño permitido.", 413); } chunks.push(value); } }
  finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new SkillPathError("INVALID_JSON", "La solicitud no contiene JSON válido."); }
}
