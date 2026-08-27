import { NextRequest, NextResponse } from "next/server";
import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import { createPaymentOrder } from "@/lib/flow";
import { TOKEN_PACK } from "@/lib/constants";

const PLAN_AMOUNT = Number(process.env.FLOW_PLAN_AMOUNT ?? TOKEN_PACK.priceClp);
const PLAN_NAME = process.env.FLOW_PLAN_NAME ?? `TurboTrabajo ${TOKEN_PACK.tokens} tokens`;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  // Without merchant credentials Flow would reject every order — tell the
  // user honestly instead of suggesting a retry that can never succeed.
  if (!process.env.FLOW_API_KEY || !process.env.FLOW_SECRET_KEY) {
    console.error("Flow create-order: FLOW_API_KEY / FLOW_SECRET_KEY not configured");
    return NextResponse.json(
      { error: "Los pagos están en habilitación. Vuelve a intentarlo pronto." },
      { status: 503 }
    );
  }

  const authHeader = req.headers.get("authorization");
  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    return NextResponse.json({ error: "Falta autenticación." }, { status: 401 });
  }

  let uid: string;
  let email: string;
  try {
    const decoded = await verifyFirebaseIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? "sin-correo@turbotrabajo.cl";
  } catch {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  try {
    const order = await createPaymentOrder({
      commerceOrder: `${uid}-${Date.now()}`,
      subject: PLAN_NAME,
      amount: PLAN_AMOUNT,
      email,
      urlConfirmation: `${APP_URL}/api/flow/webhook`,
      urlReturn: `${APP_URL}/tokens`,
    });

    return NextResponse.json({ redirectUrl: `${order.url}?token=${order.token}` });
  } catch (error) {
    console.error("Flow create-order error", error);
    return NextResponse.json({ error: "No pudimos iniciar el pago." }, { status: 502 });
  }
}
