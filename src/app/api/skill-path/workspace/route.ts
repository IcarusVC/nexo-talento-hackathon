import { skillPathStore } from "@/lib/skill-path/store";
import { apiError, privateHeaders } from "@/lib/skill-path/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try { return Response.json(await skillPathStore.workspace(new URL(request.url).searchParams.get("accountId") ?? ""), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
