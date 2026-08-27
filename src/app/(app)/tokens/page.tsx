"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { LEDGER_TYPES, TOKEN_PACK, type LedgerType } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";
import type { TokenLedgerEntry } from "@/lib/types";
import { toast } from "sonner";

const LOW_BALANCE_THRESHOLD = 3;

const LEDGER_LABELS: Record<LedgerType, string> = {
  [LEDGER_TYPES.TRIAL]: "Tokens de prueba",
  [LEDGER_TYPES.PURCHASE]: "Compra de tokens",
  [LEDGER_TYPES.RESERVE]: "Postulación en proceso",
  [LEDGER_TYPES.SETTLE]: "Postulación enviada",
  [LEDGER_TYPES.RELEASE]: "Tokens liberados",
  [LEDGER_TYPES.REFUND]: "Reembolso",
};

function formatClp(amount: number) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function TokensPage() {
  const { user, userDoc } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [ledger, setLedger] = useState<TokenLedgerEntry[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "tokenLedger"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    return onSnapshot(
      q,
      (snap) => setLedger(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as TokenLedgerEntry)),
      () => setLedger([])
    );
  }, [user]);

  if (!user || !userDoc) return null;
  const available = userDoc.wallet.balance - userDoc.wallet.reserved;
  const perApplication = Math.round(TOKEN_PACK.priceClp / TOKEN_PACK.tokens);
  const lowBalance = available <= LOW_BALANCE_THRESHOLD;

  async function handleBuy() {
    setSubmitting(true);
    // Overwritten with the API's message when it provides one (e.g. payments
    // not yet enabled) so the user isn't told to retry something that can't work.
    let message = "No pudimos iniciar el pago con Flow. Inténtalo de nuevo.";
    try {
      const idToken = await user!.getIdToken();
      const res = await fetch("/api/flow/create-order", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.redirectUrl) {
        if (typeof data?.error === "string" && data.error) message = data.error;
        throw new Error(message);
      }
      window.location.href = data.redirectUrl;
    } catch {
      toast.error(message);
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <p className="eyebrow mb-1">✦ Tus tokens</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">Tokens</h1>
      </div>

      {lowBalance && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          <div className="text-sm">
            <p className="font-bold text-brand-navy">
              {available <= 0 ? "Te quedaste sin tokens." : "Te quedan pocos tokens."}
            </p>
            <p className="text-brand-navy/70">
              {available <= 0
                ? "Compra un paquete para seguir postulando."
                : `Solo te ${available === 1 ? "queda" : "quedan"} ${available} ${
                    available === 1 ? "token" : "tokens"
                  }. Recarga para no quedarte sin postular.`}
            </p>
          </div>
        </div>
      )}

      <Card className="border-2 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold text-brand-navy">Saldo disponible</CardTitle>
          <Badge variant="accent">
            {available} {available === 1 ? "token" : "tokens"}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-brand-navy/70">
            Cada postulación usa <strong>1 token</strong>. Postulamos por ti a los empleos que elijas.
          </p>
          {userDoc.wallet.reserved > 0 && (
            <p className="text-sm text-brand-navy/50">
              {userDoc.wallet.reserved} en uso (postulaciones en proceso).
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-extrabold text-brand-navy">
            Comprar {TOKEN_PACK.tokens} tokens
          </CardTitle>
          <Badge variant="secondary">{formatClp(TOKEN_PACK.priceClp)}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-brand-navy/70">
            {TOKEN_PACK.tokens} postulaciones por {formatClp(TOKEN_PACK.priceClp)} —{" "}
            {formatClp(perApplication)} por postulación.
          </p>
          <Button onClick={handleBuy} disabled={submitting}>
            {submitting ? "Redirigiendo a Flow…" : `Comprar ${TOKEN_PACK.tokens} tokens`}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-brand-navy">Historial</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger === null && (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full rounded-xl" />
              ))}
            </div>
          )}

          {ledger !== null && ledger.length === 0 && (
            <p className="text-sm text-brand-navy/60">
              Aún no hay movimientos. Tu historial aparecerá aquí cuando compres o uses tokens.
            </p>
          )}

          {ledger !== null && ledger.length > 0 && (
            <ol className="space-y-3">
              {ledger.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-bold text-brand-navy">
                      {LEDGER_LABELS[entry.type] ?? entry.type}
                    </p>
                    <p className="text-xs text-brand-navy/50">
                      {entry.createdAt?.toDate
                        ? entry.createdAt.toDate().toLocaleDateString("es-CL")
                        : ""}
                    </p>
                  </div>
                  <span
                    className={
                      entry.amount >= 0
                        ? "text-sm font-extrabold text-success"
                        : "text-sm font-extrabold text-brand-navy/60"
                    }
                  >
                    {entry.amount > 0 ? `+${entry.amount}` : entry.amount}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
