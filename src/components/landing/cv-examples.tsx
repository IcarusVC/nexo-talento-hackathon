import Link from "next/link";
import { ArrowRight } from "lucide-react";

/* Mini CV template pages, built in code (no more gray loading skeletons).
   The page is always white paper with fixed ink-tone lines, so thumbnails
   read as documents in both light and dark themes. */

type ThumbProps = { strong: string; soft: string };

function PageSidebar({ strong, soft }: ThumbProps) {
  return (
    <div className="flex h-full overflow-hidden rounded-md bg-white shadow-sm">
      <div className={`flex w-1/3 flex-col items-center gap-1.5 p-2.5 ${soft}`}>
        <span className={`size-6 rounded-full ${strong}`} />
        <span className="mt-1 h-1 w-4/5 rounded-full bg-black/20" />
        <span className="h-1 w-3/5 rounded-full bg-black/15" />
        <span className="mt-2 h-1 w-4/5 rounded-full bg-black/10" />
        <span className="h-1 w-3/5 rounded-full bg-black/10" />
      </div>
      <div className="flex-1 p-3">
        <span className={`block h-2 w-2/3 rounded-full ${strong}`} />
        <span className="mt-1.5 block h-1 w-1/2 rounded-full bg-black/20" />
        <span className="mt-3 block h-1 w-full rounded-full bg-black/10" />
        <span className="mt-1 block h-1 w-5/6 rounded-full bg-black/10" />
        <span className="mt-1 block h-1 w-full rounded-full bg-black/10" />
        <span className="mt-3 block h-1.5 w-1/3 rounded-full bg-black/20" />
        <span className="mt-1.5 block h-1 w-full rounded-full bg-black/10" />
        <span className="mt-1 block h-1 w-4/6 rounded-full bg-black/10" />
      </div>
    </div>
  );
}

function PageBanner({ strong, soft }: ThumbProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-md bg-white shadow-sm">
      <div className={`flex items-center gap-2 p-3 ${strong}`}>
        <span className="size-6 rounded-full bg-white/80" />
        <span className="space-y-1">
          <span className="block h-1.5 w-20 rounded-full bg-white/90" />
          <span className="block h-1 w-14 rounded-full bg-white/60" />
        </span>
      </div>
      <div className="flex flex-1 gap-3 p-3">
        <div className="flex-1">
          <span className={`block h-1.5 w-2/3 rounded-full ${soft}`} />
          <span className="mt-1.5 block h-1 w-full rounded-full bg-black/10" />
          <span className="mt-1 block h-1 w-5/6 rounded-full bg-black/10" />
          <span className="mt-1 block h-1 w-full rounded-full bg-black/10" />
        </div>
        <div className="flex-1">
          <span className={`block h-1.5 w-2/3 rounded-full ${soft}`} />
          <span className="mt-1.5 block h-1 w-full rounded-full bg-black/10" />
          <span className="mt-1 block h-1 w-4/6 rounded-full bg-black/10" />
          <span className="mt-1 block h-1 w-5/6 rounded-full bg-black/10" />
        </div>
      </div>
    </div>
  );
}

function PageMinimal({ strong }: ThumbProps) {
  return (
    <div className="flex h-full flex-col items-center overflow-hidden rounded-md bg-white p-3 shadow-sm">
      <span className="mt-1 block h-2 w-1/2 rounded-full bg-black/25" />
      <span className="mt-1.5 block h-1 w-1/3 rounded-full bg-black/15" />
      <span className={`mt-2.5 block h-0.5 w-3/4 rounded-full ${strong}`} />
      <div className="mt-3 w-full space-y-1.5 px-2">
        <span className="block h-1 w-full rounded-full bg-black/10" />
        <span className="block h-1 w-5/6 rounded-full bg-black/10" />
        <span className="block h-1 w-full rounded-full bg-black/10" />
        <span className={`mt-2.5 block h-1.5 w-1/3 rounded-full ${strong}`} />
        <span className="block h-1 w-full rounded-full bg-black/10" />
        <span className="block h-1 w-4/6 rounded-full bg-black/10" />
      </div>
    </div>
  );
}

const PAGES = {
  sidebar: PageSidebar,
  banner: PageBanner,
  minimal: PageMinimal,
} as const;

type Example = {
  role: string;
  description: string;
  skills: string[];
  accent: string;
  variant: keyof typeof PAGES;
  strong: string;
  soft: string;
};

const EXAMPLES: Example[] = [
  {
    role: "Ingeniero de Software",
    description: "Ideal para desarrolladores y profesionales de tecnología.",
    skills: ["React", "Node.js", "Python"],
    accent: "from-brand-violet/15 to-brand-violet/5",
    variant: "sidebar",
    strong: "bg-brand-violet",
    soft: "bg-brand-violet/15",
  },
  {
    role: "Gerente de Marketing",
    description: "Pensado para profesionales de marketing y estrategas de marca.",
    skills: ["SEO", "Contenido", "Branding"],
    accent: "from-brand-periwinkle/20 to-brand-periwinkle/5",
    variant: "banner",
    strong: "bg-brand-periwinkle",
    soft: "bg-brand-periwinkle/25",
  },
  {
    role: "Analista de Datos",
    description: "Diseñado para científicos de datos y analistas de negocio.",
    skills: ["SQL", "Python", "Power BI"],
    accent: "from-brand-teal/15 to-brand-teal/5",
    variant: "sidebar",
    strong: "bg-brand-teal",
    soft: "bg-brand-teal/15",
  },
  {
    role: "Diseñador UX",
    description: "Creado para diseñadores y profesionales de experiencia de usuario.",
    skills: ["Figma", "Research", "Prototipado"],
    accent: "from-warning/15 to-warning/5",
    variant: "minimal",
    strong: "bg-warning",
    soft: "bg-warning/20",
  },
  {
    role: "Ejecutivo de Ventas",
    description: "Diseñado para profesionales de ventas y desarrollo de negocio.",
    skills: ["CRM", "Negociación", "B2B"],
    accent: "from-success/15 to-success/5",
    variant: "banner",
    strong: "bg-success",
    soft: "bg-success/20",
  },
  {
    role: "Jefe de Proyecto",
    description: "Perfecto para jefes de proyecto y líderes de equipo.",
    skills: ["Agile", "Scrum", "Planificación"],
    accent: "from-heading-slate/15 to-heading-slate/5",
    variant: "minimal",
    strong: "bg-heading-slate",
    soft: "bg-heading-slate/20",
  },
];

export function CvExamples() {
  return (
    <section id="ejemplos-cv" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
        Ejemplos de CV que funcionan
      </h2>
      <p className="mt-2 text-center text-base text-muted-foreground">
        Inspírate con ejemplos de CV profesionales adaptados a tu sector
      </p>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {EXAMPLES.map((example) => {
          const Page = PAGES[example.variant];
          return (
            <Link
              key={example.role}
              href="/register"
              className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow duration-300 ease-(--ease-smooth) hover:shadow-md"
            >
              <div
                aria-hidden="true"
                className={`bg-gradient-to-br p-4 pb-0 ${example.accent}`}
              >
                <div className="h-36 transition-transform duration-300 ease-(--ease-smooth) group-hover:-translate-y-1">
                  <Page strong={example.strong} soft={example.soft} />
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-base font-bold text-heading-slate">{example.role}</h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {example.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {example.skills.map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-brand-violet-strong"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
                <p className="mt-4 flex items-center gap-1 text-sm font-bold text-brand-violet transition-colors duration-200 ease-(--ease-decelerate) group-hover:text-brand-violet-strong">
                  Usar esta plantilla
                  <ArrowRight className="size-3.5 transition-transform duration-200 ease-(--ease-decelerate) group-hover:translate-x-0.5" />
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
