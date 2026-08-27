"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ApplyError, withdrawApplicationViaServer } from "@/lib/applications";
import { APPLICATION_STATUS_LABELS, APPLICATION_STATUSES } from "@/lib/constants";
import type { Application, ListingPrep } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [prep, setPrep] = useState<ListingPrep[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, "applications", params.id), (snap) => {
      setApplication(snap.exists() ? ({ id: snap.id, ...snap.data() } as Application) : null);
    });
  }, [params.id]);

  useEffect(() => {
    if (!application) return;
    getDocs(collection(db, "listings", application.listingId, "prep")).then((snap) => {
      setPrep(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ListingPrep));
    });
  }, [application]);

  if (!application) {
    return <p className="text-sm text-zinc-500">Cargando...</p>;
  }

  const canWithdraw = application.status === APPLICATION_STATUSES.PENDIENTE;

  async function handleWithdraw() {
    if (!application || !user) return;
    setWithdrawing(true);
    try {
      await withdrawApplicationViaServer(await user.getIdToken(), application.id);
      toast.success("Retiraste tu postulación. Tu token quedó disponible de nuevo.");
    } catch (error) {
      toast.error(
        error instanceof ApplyError ? error.message : "No pudimos retirar tu postulación."
      );
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/applications")}>
        ← Volver a mis postulaciones
      </Button>

      <Card className="border-2 border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-extrabold text-brand-navy">
              {application.listingTitle}
            </CardTitle>
            <p className="text-sm text-brand-navy/60">{application.company}</p>
          </div>
          <Badge variant="accent">{APPLICATION_STATUS_LABELS[application.status]}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {canWithdraw && (
            <Button variant="outline" size="sm" onClick={handleWithdraw} disabled={withdrawing}>
              Retirar postulación
            </Button>
          )}

          <Separator />

          <div>
            <h3 className="mb-2 text-sm font-bold text-brand-navy">Historial</h3>
            <ol className="space-y-2 text-sm text-brand-navy/70">
              {application.statusHistory.map((entry, i) => (
                <li key={i} className="flex justify-between border-b border-border pb-1 last:border-0">
                  <span>{APPLICATION_STATUS_LABELS[entry.status]}</span>
                  <span className="text-brand-navy/40">
                    {entry.at && "toDate" in entry.at
                      ? (entry.at as { toDate: () => Date }).toDate().toLocaleDateString("es-CL")
                      : ""}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      </Card>

      {prep.length > 0 && (
        <Card className="border-2 border-brand-paleblue bg-brand-paleblue/20">
          <CardHeader>
            <CardTitle className="text-base font-extrabold text-brand-navy">
              Preparación de entrevista
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {prep.map((qa) => (
              <div key={qa.id}>
                <p className="text-sm font-bold text-brand-navy">{qa.question}</p>
                <p className="text-sm text-brand-navy/70">{qa.answer}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
