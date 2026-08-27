import Link from "next/link";
import { Cloud, MapPin, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/landing/brand-logo";

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Datos protegidos" },
  { icon: Cloud, label: "Infraestructura Google Cloud" },
  { icon: MapPin, label: "Hecho en Chile" },
];

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Herramientas",
    links: [
      { label: "Aplicar Auto", href: "/dashboard" },
      { label: "Carta IA", href: "#proximamente" },
      { label: "Creador de CV con IA", href: "/cv" },
      { label: "Entrevista Simulada", href: "#proximamente" },
      { label: "Interview Buddy", href: "#proximamente" },
      { label: "Traductor de CV", href: "#proximamente" },
      { label: "Ofertas", href: "/dashboard" },
      { label: "LinkedIn a CV", href: "#proximamente" },
      { label: "Escáner de CV con IA", href: "#proximamente" },
      { label: "Todas las herramientas gratis", href: "#proximamente" },
    ],
  },
  {
    title: "Ejemplos",
    links: [
      { label: "Ejemplos de CV", href: "#ejemplos-cv" },
      { label: "Ejemplos de Carta", href: "#proximamente" },
    ],
  },
  {
    title: "Recursos",
    links: [
      { label: "Guías Profesionales", href: "#proximamente" },
      { label: "Habilidades Laborales", href: "#proximamente" },
      { label: "Guías Salariales", href: "#proximamente" },
      { label: "Info. IA", href: "#proximamente" },
    ],
  },
  {
    title: "Empresas",
    links: [
      { label: "White Label", href: "#proximamente" },
      { label: "Afiliado", href: "#proximamente" },
      { label: "Coaching Profesional", href: "#proximamente" },
      { label: "Contrata Talento", href: "#proximamente" },
      { label: "Laboratorios de Datos Humanos", href: "#proximamente" },
    ],
  },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-6 border-b border-border pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" aria-label="TurboTrabajo — inicio">
              <BrandLogo markClassName="size-9" />
            </Link>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">
              Encuentra empleos que calzan contigo y postula con un clic.
            </p>
          </div>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {TRUST_BADGES.map((badge) => (
              <li
                key={badge.label}
                className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"
              >
                <badge.icon className="size-4 text-brand-violet" />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {COLUMNS.map((column) => (
            <div key={column.title}>
              <p className="text-xs font-bold tracking-wide text-muted-foreground uppercase">
                {column.title}
              </p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground/80 transition-colors duration-200 ease-(--ease-decelerate) hover:text-brand-violet hover:underline"
                    >
                      {link.label}
                      {link.href === "#proximamente" && (
                        <span className="ml-1.5 text-xs text-muted-foreground">(Próximamente)</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} TurboTrabajo. Todos los derechos reservados.</p>
          <p>Hecho en Chile, para Chile.</p>
        </div>
      </div>
    </footer>
  );
}
