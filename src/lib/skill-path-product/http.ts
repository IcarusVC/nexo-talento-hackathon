import { ProductError } from "./validation";
export const productHeaders = { "Cache-Control": "no-store", "Vary": "Origin", "X-Content-Type-Options": "nosniff" };
export function productError(error: unknown): Response { return Response.json({ error: error instanceof ProductError ? error.message : "No se pudo completar la operación. Los datos guardados se conservan.", code: error instanceof ProductError ? error.code : "SERVICE_ERROR" }, { status: error instanceof ProductError ? error.status : 503, headers: productHeaders }); }
export async function readProductBody(request: Request): Promise<unknown> {
  const url = new URL(request.url); const origin = request.headers.get("origin");
  const host = request.headers.get("host") ?? url.host;
  if (!/^[a-zA-Z0-9.\-\[\]:]+$/.test(host) || origin !== `${url.protocol}//${host}` || request.headers.get("sec-fetch-site") === "cross-site") throw new ProductError("SAME_ORIGIN_REQUIRED", "Envía esta acción desde Skill path.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ProductError("JSON_REQUIRED", "La solicitud debe usar JSON.", 415);
  const reader = request.body?.getReader(); if (!reader) throw new ProductError("INVALID_JSON", "La solicitud está vacía.");
  const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2850000) { await reader.cancel(); throw new ProductError("BODY_TOO_LARGE", "El archivo o solicitud supera el tamaño permitido.", 413); } chunks.push(value); } } finally { reader.releaseLock(); }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ProductError("INVALID_JSON", "La solicitud no contiene JSON válido."); }
}
