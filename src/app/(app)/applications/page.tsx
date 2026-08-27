"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import type { Application } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Inbox } from "lucide-react";

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[] | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "applications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    return onSnapshot(q, (snap) => {
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Application));
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-1">✦ Tu progreso</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">Mis postulaciones</h1>
        <p className="mt-1 text-sm text-brand-navy/60">
          Sigue el estado de cada empleo al que postulaste.
        </p>
      </div>

      {applications === null && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {applications !== null && applications.length === 0 && (
        <EmptyState
          icon={Inbox}
          title="Todavía no has postulado a ningún empleo"
          description="Cuando postules a un empleo, podrás seguir su estado aquí."
          action={{ label: "Ver empleos para ti", href: "/dashboard" }}
        />
      )}

      <div className="space-y-3">
        {applications?.map((app) => (
          <Link key={app.id} href={`/applications/${app.id}`}>
            <Card className="border-2 border-border transition hover:border-brand-navy/40">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-extrabold text-brand-navy">
                  {app.listingTitle}
                </CardTitle>
                <Badge variant="accent">{APPLICATION_STATUS_LABELS[app.status]}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-brand-navy/60">{app.company}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
