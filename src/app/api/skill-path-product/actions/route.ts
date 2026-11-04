import { productStore } from "@/lib/skill-path-product/store";
import { productError, productHeaders, readProductBody } from "@/lib/skill-path-product/http";
export const runtime = "nodejs";
export async function POST(request: Request) { try { return Response.json(await productStore.act(await readProductBody(request)), { headers: productHeaders }); } catch (error) { return productError(error); } }
