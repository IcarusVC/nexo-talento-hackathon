import { productStore } from "@/lib/skill-path-product/store";
import { productError, productHeaders } from "@/lib/skill-path-product/http";
export const runtime = "nodejs";
export async function GET(request: Request) { try { return Response.json(await productStore.getWorkspace(new URL(request.url).searchParams.get("accountId") ?? ""), { headers: productHeaders }); } catch (error) { return productError(error); } }
