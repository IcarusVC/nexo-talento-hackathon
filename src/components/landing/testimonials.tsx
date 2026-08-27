import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

// Quotes come from real early users (first names only — we don't publish
// surnames or employers we can't verify). Sector labels use the platform's
// own category vocabulary.
const TESTIMONIALS = [
  {
    name: "Mario",
    sector: "Comercial y Ventas",
    region: "Región Metropolitana",
    quote: "Postulé a más de 200 trabajos en una semana y cerré reuniones reales.",
    avatarClass: "from-brand-violet to-brand-periwinkle",
  },
  {
    name: "Marcela",
    sector: "Administración y Oficina",
    region: "Valparaíso",
    quote: "¡Estoy feliz! Postulé a más de 100 trabajos en un solo día.",
    avatarClass: "from-brand-teal to-brand-periwinkle",
  },
  {
    name: "Diego",
    sector: "Gerencia y Dirección",
    region: "Región Metropolitana",
    quote:
      "Me encantó cómo filtraron y postularon automáticamente a más de 100 trabajos de alta gerencia en un día.",
    avatarClass: "from-brand-periwinkle to-brand-violet",
  },
];

function Stars() {
  return (
    <span
      role="img"
      aria-label="Valoración: 5 de 5 estrellas"
      className="flex items-center gap-0.5"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="size-3.5 fill-warning text-warning" />
      ))}
    </span>
  );
}

export function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
        Ayudamos a candidatos a triunfar
      </h2>

      <div className="mt-10 grid gap-6 sm:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <figure
            key={testimonial.name}
            className="flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white",
                    testimonial.avatarClass
                  )}
                >
                  {testimonial.name[0]}
                </span>
                <figcaption>
                  <p className="text-sm font-bold text-foreground">{testimonial.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.sector} · {testimonial.region}
                  </p>
                </figcaption>
              </div>
              <Stars />
            </div>
            <blockquote className="mt-4 text-sm leading-6 text-muted-foreground">
              “{testimonial.quote}”
            </blockquote>
          </figure>
        ))}
      </div>
    </section>
  );
}
