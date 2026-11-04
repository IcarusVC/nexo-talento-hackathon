import { ACCOUNTS } from "@/lib/skill-path-product/seed";
import { productHeaders } from "@/lib/skill-path-product/http";
export async function GET() { return Response.json(ACCOUNTS, { headers: productHeaders }); }
