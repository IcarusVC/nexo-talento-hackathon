"use client";

import { useMemo, useState } from "react";
import { ListingCard } from "@/components/listing-card";
import { ApplyAllButton } from "@/components/apply-all-button";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONTRACT_TYPES, JOURNADAS } from "@/lib/constants";
import { SearchX } from "lucide-react";
import type { MatchedListing } from "@/lib/types";

type SortKey = "match" | "salary" | "recent";

const ALL = "all";

// Base UI's Select.Value renders the raw value ("salary", "all") unless the
// Root gets an items map to resolve friendly labels from.
const SORT_ITEMS: Record<SortKey, string> = {
  match: "Mejor calce",
  salary: "Mayor renta",
  recent: "Más recientes",
};
const CONTRACT_ITEMS: Record<string, string> = {
  [ALL]: "Todos",
  ...Object.fromEntries(CONTRACT_TYPES.map((t) => [t, t])),
};
const JOURNADA_ITEMS: Record<string, string> = {
  [ALL]: "Todas",
  ...Object.fromEntries(JOURNADAS.map((j) => [j, j])),
};

function salaryTop(l: MatchedListing): number {
  return l.salary_max ?? l.salary_min ?? 0;
}

export function JobsFeed({ listings }: { listings: MatchedListing[] }) {
  const [contractType, setContractType] = useState<string>(ALL);
  const [journada, setJournada] = useState<string>(ALL);
  const [sort, setSort] = useState<SortKey>("match");

  const filtered = useMemo(() => {
    const result = listings.filter(
      (l) =>
        (contractType === ALL || l.contract_type === contractType) &&
        (journada === ALL || l.journada === journada)
    );

    if (sort === "salary") {
      return [...result].sort((a, b) => salaryTop(b) - salaryTop(a));
    }
    if (sort === "recent") {
      return [...result].sort(
        (a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0)
      );
    }
    return result; // "match" — keep incoming matchScore order
  }, [listings, contractType, journada, sort]);

  const hasFilters = contractType !== ALL || journada !== ALL;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="text-xs font-bold text-brand-navy/60">Contrato</label>
          <Select
            items={CONTRACT_ITEMS}
            value={contractType}
            onValueChange={(v) => setContractType(v ?? ALL)}
          >
            <SelectTrigger size="sm" aria-label="Filtrar por tipo de contrato">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {CONTRACT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-brand-navy/60">Jornada</label>
          <Select
            items={JOURNADA_ITEMS}
            value={journada}
            onValueChange={(v) => setJournada(v ?? ALL)}
          >
            <SelectTrigger size="sm" aria-label="Filtrar por jornada">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas</SelectItem>
              {JOURNADAS.map((j) => (
                <SelectItem key={j} value={j}>
                  {j}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-brand-navy/60">Ordenar por</label>
          <Select
            items={SORT_ITEMS}
            value={sort}
            onValueChange={(v) => setSort((v ?? "match") as SortKey)}
          >
            <SelectTrigger size="sm" aria-label="Ordenar resultados">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="match">Mejor calce</SelectItem>
              <SelectItem value="salary">Mayor renta</SelectItem>
              <SelectItem value="recent">Más recientes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <ApplyAllButton listings={filtered} />
        </div>
      </div>

      <p className="text-sm text-brand-navy/60">
        {filtered.length} {filtered.length === 1 ? "empleo" : "empleos"}
        {hasFilters ? " con estos filtros" : ""}
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Ningún empleo con estos filtros"
          description="Prueba quitando algún filtro para ver más resultados que calzan con tu perfil."
          action={
            hasFilters
              ? {
                  label: "Limpiar filtros",
                  onClick: () => {
                    setContractType(ALL);
                    setJournada(ALL);
                  },
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {hasFilters && filtered.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setContractType(ALL);
            setJournada(ALL);
          }}
        >
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}
