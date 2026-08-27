import Link from "next/link";
import { Check, ClipboardList, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountUp } from "@/components/landing/count-up";

/* Product-factual comparison — no invented percentages: the value is the
   repeated form-filling that disappears, shown visually. */
function ComparisonPanel() {
  return (
    <div className="mx-auto mt-10 grid max-w-3xl gap-4 px-4 text-left sm:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card/70 p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <ClipboardList className="size-4" />
          Postulando a mano
        </p>
        <div className="mt-4 space-y-2" aria-hidden="true">
          {["Portal A", "Portal B", "Portal C"].map((portal, i) => (
            <div
              key={portal}
              className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-background/60 px-3 py-2"
              style={{ opacity: 1 - i * 0.18 }}
            >
              <div className="h-1.5 w-16 rounded-full bg-foreground/15" />
              <div className="h-1.5 flex-1 rounded-full bg-foreground/10" />
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          El mismo formulario, una y otra vez, en cada portal.
        </p>
      </div>

      <div className="rounded-2xl border border-brand-violet/30 bg-card p-5 shadow-cta">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-violet-strong">
          <MousePointerClick className="size-4" />
          Con TurboTrabajo
        </p>
        <div className="mt-4 flex items-center gap-3" aria-hidden="true">
          <span className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-puffy">
            Postular
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
            <Check className="size-3.5" />
            Postulado
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Un clic por postulación. Tu perfil y tu CV viajan por ti.
        </p>
      </div>
    </div>
  );
}

const STATS = [
  { value: 25000, suffix: "+", label: "empleos disponibles hoy" },
  { value: 16, suffix: "", label: "regiones de Chile cubiertas" },
  { value: 24, suffix: " h", label: "o menos para tu CV mejorado" },
];

export function StatBand() {
  return (
    <section className="bg-tint py-16 text-center">
      <p className="text-balance mx-auto max-w-3xl px-4 text-2xl font-bold text-foreground sm:text-3xl">
        Deja de llenar el mismo formulario una y otra vez: postula a los empleos
        que calzan contigo con un clic.
      </p>

      <ComparisonPanel />

      <dl className="mx-auto mt-12 grid max-w-3xl gap-8 px-4 sm:grid-cols-3">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <dt className="sr-only">{stat.label}</dt>
            <dd className="text-3xl font-bold text-foreground sm:text-4xl">
              <CountUp value={stat.value} suffix={stat.suffix} />
            </dd>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </dl>

      <p className="mt-6 px-4 text-xs text-muted-foreground">
        Empleos activos en nuestra base, agregados desde portales de empleo chilenos.
      </p>

      <div className="mt-8">
        <Button size="lg" nativeButton={false} render={<Link href="/register" />}>
          Empezar ahora
        </Button>
      </div>
    </section>
  );
}
