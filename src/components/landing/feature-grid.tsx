import {
  ArrowRight,
  Bot,
  Check,
  FileText,
  Languages,
  Mail,
  MessageSquareText,
  Mic,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/* Each tool card gets a small code-built product scene (crisp, theme-aware,
   zero image payload) instead of a lone monochrome icon. */

function VisualAutoApply() {
  return (
    <div className="flex h-28 flex-col justify-center gap-2 rounded-xl bg-gradient-to-br from-brand-violet/10 to-brand-violet/5 p-4">
      {[
        { width: "w-24", label: "Postulado", tone: "bg-success/15 text-success" },
        { width: "w-20", label: "Postulando…", tone: "bg-warning/15 text-warning" },
      ].map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2"
        >
          <div className={`h-1.5 ${row.width} rounded-full bg-foreground/20`} />
          <span className={`rounded-full px-2 py-0.5 text-[0.6rem] font-bold ${row.tone}`}>
            {row.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function VisualCvUpgrade() {
  return (
    <div className="flex h-28 items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand-periwinkle/15 to-brand-periwinkle/5 p-4">
      <div className="w-16 rounded-lg border border-border bg-card p-2 opacity-60">
        <div className="h-1.5 w-3/4 rounded-full bg-foreground/20" />
        <div className="mt-1.5 h-1 w-full rounded-full bg-foreground/10" />
        <div className="mt-1 h-1 w-5/6 rounded-full bg-foreground/10" />
      </div>
      <ArrowRight className="size-4 shrink-0 text-brand-violet" />
      <div className="relative w-16 rounded-lg border border-brand-violet/40 bg-card p-2 shadow-sm">
        <div className="h-1.5 w-3/4 rounded-full bg-brand-violet/60" />
        <div className="mt-1.5 h-1 w-full rounded-full bg-foreground/15" />
        <div className="mt-1 h-1 w-5/6 rounded-full bg-foreground/15" />
        <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-success text-white">
          <Check className="size-3" />
        </span>
      </div>
    </div>
  );
}

function VisualCoverLetter() {
  return (
    <div className="flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-brand-teal/15 to-brand-teal/5 p-4">
      <div className="relative w-32 rounded-lg border border-border bg-card p-3 shadow-sm">
        <div className="h-1.5 w-1/2 rounded-full bg-foreground/25" />
        <div className="mt-2 h-1 w-full rounded-full bg-foreground/10" />
        <div className="mt-1 h-1 w-full rounded-full bg-foreground/10" />
        <div className="mt-1 h-1 w-2/3 rounded-full bg-foreground/10" />
        <span className="absolute -top-2.5 -right-2.5 flex size-6 items-center justify-center rounded-full bg-brand-violet text-white shadow-sm">
          <Sparkles className="size-3.5" />
        </span>
      </div>
    </div>
  );
}

function VisualInterviewPractice() {
  const bars = [10, 18, 26, 16, 30, 20, 12, 24, 14];
  return (
    <div className="flex h-28 items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-warning/15 to-warning/5 p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-violet text-white shadow-sm">
        <Mic className="size-4" />
      </span>
      <div className="flex items-center gap-1" aria-hidden="true">
        {bars.map((height, i) => (
          <span
            key={i}
            style={{ height }}
            className="w-1 rounded-full bg-brand-violet/50"
          />
        ))}
      </div>
    </div>
  );
}

function VisualInterviewBuddy() {
  return (
    <div className="flex h-28 flex-col justify-center gap-2 rounded-xl bg-gradient-to-br from-success/10 to-success/5 p-4">
      <div className="max-w-[75%] self-start rounded-xl rounded-bl-sm border border-border bg-card px-3 py-1.5 text-[0.65rem] font-semibold text-muted-foreground">
        ¿Cuál es tu mayor fortaleza?
      </div>
      <div className="max-w-[75%] self-end rounded-xl rounded-br-sm bg-brand-violet px-3 py-1.5 text-[0.65rem] font-semibold text-white">
        Sugerencia lista ✓
      </div>
    </div>
  );
}

function VisualTranslator() {
  return (
    <div className="flex h-28 items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand-violet/10 to-brand-teal/10 p-4">
      <span className="rounded-lg border border-border bg-card px-3 py-2 text-sm font-black text-foreground">
        ES
      </span>
      <ArrowRight className="size-4 text-brand-violet" />
      <span className="rounded-lg border border-brand-violet/40 bg-card px-3 py-2 text-sm font-black text-brand-violet">
        EN
      </span>
    </div>
  );
}

type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
  visual: () => React.ReactNode;
  soon?: boolean;
};

const FEATURES: Feature[] = [
  {
    icon: Bot,
    title: "Postulación Auto",
    description:
      "TurboTrabajo postula por ti a cientos de empleos compatibles mientras te preparas para las entrevistas.",
    visual: VisualAutoApply,
  },
  {
    icon: FileText,
    title: "CV mejorado por expertos",
    description:
      "Sube tu CV y nuestro equipo te entrega una versión mejorada en menos de 24 horas para que la revises y apruebes.",
    visual: VisualCvUpgrade,
  },
  {
    icon: Mail,
    title: "Carta IA",
    description:
      "Genera cartas de presentación personalizadas en segundos, ajustadas a cada empleo.",
    visual: VisualCoverLetter,
    soon: true,
  },
  {
    icon: Mic,
    title: "Práctica de Entrevista IA",
    description:
      "Simula entrevistas reales con preguntas específicas del rol y feedback al instante.",
    visual: VisualInterviewPractice,
    soon: true,
  },
  {
    icon: MessageSquareText,
    title: "Interview Buddy",
    description:
      "Recibe ayuda en tiempo real y sugerencias de respuesta durante tus entrevistas en vivo.",
    visual: VisualInterviewBuddy,
    soon: true,
  },
  {
    icon: Languages,
    title: "Traductor de CV",
    description:
      "Expande tus oportunidades traduciendo tu CV a más idiomas, conservando formato e impacto.",
    visual: VisualTranslator,
    soon: true,
  },
];

export function FeatureGrid() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold text-foreground sm:text-4xl">
        ¡Todo lo que necesitas para conseguir empleo rápido!
      </h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow duration-300 ease-(--ease-smooth) hover:shadow-md"
          >
            <div aria-hidden="true">
              <feature.visual />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-tint text-brand-violet">
                <feature.icon className="size-4" />
              </span>
              <h3 className="text-base font-bold text-heading-slate">{feature.title}</h3>
              {feature.soon && (
                <span className="rounded-full bg-tint-strong px-2 py-0.5 text-xs font-bold whitespace-nowrap text-brand-violet-strong">
                  Próximamente
                </span>
              )}
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
