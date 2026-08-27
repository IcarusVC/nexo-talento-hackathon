"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplyButton } from "@/components/apply-button";
import { cleanListingText } from "@/lib/utils";
import type { MatchedListing } from "@/lib/types";

function formatClp(amount: number | null | undefined) {
  if (amount == null) return null;
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(
    amount
  );
}

export function ListingCard({ listing }: { listing: MatchedListing }) {
  const salaryRange =
    listing.salary_min != null || listing.salary_max != null
      ? `${formatClp(listing.salary_min) ?? "?"} - ${formatClp(listing.salary_max) ?? "a convenir"}`
      : null;

  return (
    <Card className="border-2 border-border bg-brand-paleblue/25 ring-0">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base font-extrabold text-brand-navy">
            <Link href={`/jobs/${listing.id}`} className="hover:underline">
              {listing.title}
            </Link>
          </CardTitle>
          <p className="text-sm font-medium text-brand-navy/60">{listing.company}</p>
        </div>
        <Badge variant="accent">{listing.category}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">{listing.region}</Badge>
          {listing.comuna && <Badge variant="secondary">{listing.comuna}</Badge>}
          <Badge variant="secondary">{listing.contract_type}</Badge>
          <Badge variant="secondary">{listing.journada}</Badge>
        </div>
        {salaryRange && (
          <p className="text-sm font-bold text-brand-navy">Renta: {salaryRange}</p>
        )}
        <p className="line-clamp-3 text-sm text-brand-navy/70">
          {cleanListingText(listing.description)}
        </p>
        <div className="flex gap-2">
          <ApplyButton listing={listing} className="flex-1" />
          <Button variant="outline" nativeButton={false} render={<Link href={`/jobs/${listing.id}`} />}>
            Ver detalle
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
