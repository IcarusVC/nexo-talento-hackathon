"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ApplyButton } from "@/components/apply-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";
import { cleanListingText } from "@/lib/utils";
import type { Listing, ListingPrep } from "@/lib/types";

function formatClp(amount: number | null | undefined) {
  if (amount == null) return null;
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null | undefined>(undefined);
  const [prep, setPrep] = useState<ListingPrep[]>([]);

  useEffect(() => {
    getDoc(doc(db, "listings", params.id))
      .then((snap) => setListing(snap.exists() ? ({ id: snap.id, ...snap.data() } as Listing) : null))
      .catch(() => setListing(null));
  }, [params.id]);

  useEffect(() => {
    if (!listing) return;
    getDocs(collection(db, "listings", listing.id, "prep"))
      .then((snap) => setPrep(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ListingPrep)))
      .catch(() => setPrep([]));
  }, [listing]);

  if (listing === undefined) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (listing === null) {
    return (
      <div className="max-w-2xl space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
          ← Volver a empleos
        </Button>
        <p className="text-sm text-brand-navy/60">
          Esta oferta ya no está disponible o no la encontramos.
        </p>
      </div>
    );
  }

  const salaryRange =
    listing.salary_min != null || listing.salary_max != null
      ? `${formatClp(listing.salary_min) ?? "?"} - ${formatClp(listing.salary_max) ?? "a convenir"}`
      : "A convenir";

  return (
    <div className="max-w-2xl space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
        ← Volver a empleos
      </Button>

      <Card className="border-2 border-border">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xl font-extrabold text-brand-navy">{listing.title}</CardTitle>
            <p className="text-sm font-medium text-brand-navy/60">{listing.company}</p>
          </div>
          <Badge variant="accent">{listing.category}</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">{listing.region}</Badge>
            {listing.comuna && <Badge variant="secondary">{listing.comuna}</Badge>}
            <Badge variant="secondary">{listing.contract_type}</Badge>
            <Badge variant="secondary">{listing.journada}</Badge>
          </div>

          <p className="text-sm font-bold text-brand-navy">Renta: {salaryRange}</p>

          <Separator />

          <div>
            <h2 className="mb-1 text-sm font-bold text-brand-navy">Descripción</h2>
            <p className="text-sm whitespace-pre-line text-brand-navy/70">
              {cleanListingText(listing.description)}
            </p>
          </div>

          {listing.url && (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-bold text-brand-coral hover:underline"
            >
              Ver oferta original <ExternalLink className="size-3.5" />
            </a>
          )}

          <Separator />

          <ApplyButton listing={listing} className="w-full" />
          <p className="text-center text-xs text-brand-navy/50">
            Postular usa 1 token. Postulamos por ti con tu CV aprobado.
          </p>
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
