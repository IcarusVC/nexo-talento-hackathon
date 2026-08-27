import { Check, FileUp, MousePointerClick, Sparkles } from "lucide-react";

/** Mini scene: CV document + upload confirmation. */
function StepVisualProfile() {
  return (
    <div className="flex h-28 items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand-violet/10 to-brand-violet/5 p-4">
      <div className="w-20 rounded-lg border border-border bg-card p-2.5 shadow-sm">
        <div className="h-1.5 w-3/4 rounded-full bg-brand-violet/50" />
        <div className="mt-1.5 h-1 w-1/2 rounded-full bg-foreground/15" />
        <div className="mt-2.5 h-1 w-full rounded-full bg-foreground/10" />
        <div className="mt-1 h-1 w-5/6 rounded-full bg-foreground/10" />
        <div className="mt-1 h-1 w-full rounded-full bg-foreground/10" />
      </div>
      <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
        <FileUp className="size-3.5" />
        CV subido
      </span>
    </div>
  );
}

/** Mini scene: matched job row with compatibility badge. */
function StepVisualMatch() {
  return (
    <div className="flex h-28 items-center justify-center rounded-xl bg-gradient-to-br from-brand-periwinkle/15 to-brand-periwinkle/5 p-4">
      <div className="flex w-full max-w-56 items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div>
          <div className="h-1.5 w-24 rounded-full bg-foreground/25" />
          <div className="mt-1.5 h-1 w-16 rounded-full bg-foreground/10" />
        </div>
        <span className="flex items-center gap-1 rounded-full bg-success/15 px-2 py-1 text-xs font-bold text-success">
          <Sparkles className="size-3" />
          92%
        </span>
      </div>
    </div>
  );
}

/** Mini scene: one-click apply → applied. */
function StepVisualApply() {
  return (
    <div className="flex h-28 items-center justify-center gap-3 rounded-xl bg-gradient-to-br from-brand-teal/15 to-brand-teal/5 p-4">
      <span className="relative rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground shadow-puffy">
        Postular
        <MousePointerClick className="absolute -right-3 -bottom-3 size-5 text-foreground/60" />
      </span>
      <span className="flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs font-bold text-success">
        <Check className="size-3.5" />
        Postulado
      </span>
    </div>
  );
}

const STEPS = [
  {
    title: "Crea tu perfil y sube tu CV",
    description:
      "Cuéntanos tus regiones, categorías y expectativas. Nuestro equipo mejora tu CV en menos de 24 horas.",
    visual: StepVisualProfile,
  },
  {
    title: "Recibe empleos que calzan contigo",
    description:
      "Cruzamos tu perfil con 25.000+ empleos activos y te mostramos solo los que calzan, con su porcentaje de compatibilidad.",
    visual: StepVisualMatch,
  },
  {
    title: "Postula con un clic y prepárate",
    description:
      "Postulamos por ti sin formularios repetidos, mientras tú te concentras en preparar las entrevistas.",
    visual: StepVisualApply,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <p className="eyebrow justify-center text-brand-violet-strong">Cómo funciona</p>
      <h2 className="mx-auto mt-2 max-w-2xl text-center text-3xl font-bold text-foreground sm:text-4xl">
        De cero a entrevista en 3 pasos
      </h2>

      <ol className="mt-10 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div aria-hidden="true">
              <step.visual />
            </div>
            <div className="mt-4 flex items-center gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tint-strong text-sm font-black text-brand-violet-strong">
                {index + 1}
              </span>
              <h3 className="text-base font-bold text-heading-slate">{step.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {step.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
