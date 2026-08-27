import { Lock, MapPin, Sparkles } from "lucide-react";
import { ApplyingStatusCard } from "@/components/landing/applying-status-card";

// Illustrative product preview mirroring the real /dashboard UI (match cards +
// stats). Companies are generic descriptors, not brand names — same policy as
// trusted-by.tsx: we don't fabricate employer logos or names.
const MOCK_JOBS = [
  {
    title: "Analista de Datos",
    company: "Empresa de retail",
    region: "Metropolitana",
    match: 92,
  },
  {
    title: "Ingeniero de Software",
    company: "Fintech en crecimiento",
    region: "Valparaíso",
    match: 87,
  },
];

const MOCK_STATS = [
  { label: "Coincidencias", value: "48" },
  { label: "Postulaciones", value: "132" },
  { label: "Perfil", value: "100%" },
];

/**
 * Browser-framed mockup of the dashboard with the live ApplyingStatusCard
 * floating over it — the "machine applying for you", built in code (crisp at
 * any DPI, theme-aware) rather than as a baked screenshot asset.
 */
export function HeroMockup() {
  return (
    <div className="relative pb-16 lg:pb-10">
      <div
        aria-hidden="true"
        className="absolute -inset-6 rounded-[2.5rem] bg-gradient-to-br from-brand-violet/20 via-brand-periwinkle/10 to-brand-teal/20 blur-2xl"
      />

      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-cta"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-2.5">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive/60" />
            <span className="size-2.5 rounded-full bg-warning/60" />
            <span className="size-2.5 rounded-full bg-success/60" />
          </span>
          <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-background px-3 py-1 text-[0.65rem] font-semibold text-muted-foreground">
            <Lock className="size-2.5 shrink-0" />
            <span className="truncate">turbotrabajo.vercel.app/dashboard</span>
          </span>
        </div>

        {/* Dashboard body */}
        <div className="space-y-3 bg-background p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black tracking-tight text-foreground">
              Empleos para ti
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-tint px-2.5 py-1 text-[0.65rem] font-bold text-brand-violet-strong">
              <Sparkles className="size-3" />
              48 coincidencias hoy
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {MOCK_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card px-3 py-2"
              >
                <p className="text-sm font-black text-foreground">{stat.value}</p>
                <p className="text-[0.6rem] font-bold tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {MOCK_JOBS.map((job) => (
            <div
              key={job.title}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-foreground">{job.title}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  {job.company}
                  <span aria-hidden="true">·</span>
                  <MapPin className="size-3 shrink-0" />
                  {job.region}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-success/15 px-2.5 py-1 text-[0.65rem] font-bold text-success">
                  {job.match}% match
                </span>
                <span className="rounded-full bg-primary px-3 py-1.5 text-[0.65rem] font-bold text-primary-foreground">
                  Postular
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Live status card floating over the mockup */}
      <div className="absolute -bottom-2 left-1/2 w-[min(100%,22rem)] -translate-x-1/2 drop-shadow-xl lg:-left-8 lg:translate-x-0">
        <ApplyingStatusCard />
      </div>
    </div>
  );
}
