import { productStore } from "@/lib/skill-path-product/store";
import { productError, productHeaders } from "@/lib/skill-path-product/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try { const params = new URL(request.url).searchParams; const file = await productStore.getAttachment(params.get("accountId") ?? "", params.get("attachmentId") ?? ""); return new Response(new Uint8Array(Buffer.from(file.base64, "base64")), { headers: { ...productHeaders, "Content-Type": file.mimeType, "Content-Length": String(file.size), "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`, "Content-Security-Policy": "sandbox; default-src 'none'" } }); } catch (error) { return productError(error); }
}
