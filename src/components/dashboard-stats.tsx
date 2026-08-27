import { FileCheck2, Send, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number | null;
}) {
  return (
    <Card className="flex flex-row items-center gap-3 border-2 border-border p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-paleblue text-brand-coral">
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        {value === null ? (
          <Skeleton className="h-7 w-12 rounded-md" />
        ) : (
          <p className="text-2xl font-black tracking-tight text-brand-navy">{value}</p>
        )}
        <p className="text-xs font-bold tracking-wide text-brand-navy/50 uppercase">{label}</p>
      </div>
    </Card>
  );
}

export function DashboardStats({
  applications,
  matches,
  completeness,
}: {
  applications: number | null;
  matches: number | null;
  completeness: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard icon={Send} label="Postulaciones" value={applications} />
      <StatCard icon={Sparkles} label="Empleos para ti" value={matches} />
      <StatCard icon={FileCheck2} label="Perfil completo" value={`${completeness}%`} />
    </div>
  );
}
