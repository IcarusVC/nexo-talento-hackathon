import { skillPathStore } from "@/lib/skill-path/store";
import { apiError, privateHeaders } from "@/lib/skill-path/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json({ accounts: await skillPathStore.accounts() }, { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
