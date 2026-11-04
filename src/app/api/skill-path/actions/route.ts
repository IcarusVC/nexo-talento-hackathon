import { skillPathStore } from "@/lib/skill-path/store";
import { apiError, privateHeaders, readActionBody } from "@/lib/skill-path/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try { return Response.json(await skillPathStore.act(await readActionBody(request)), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
