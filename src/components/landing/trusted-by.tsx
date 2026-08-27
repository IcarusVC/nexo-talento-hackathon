import {
  Briefcase,
  Building2,
  Calculator,
  Factory,
  GraduationCap,
  HardHat,
  Headphones,
  HeartPulse,
  Laptop,
  Megaphone,
  Mountain,
  Package,
  TrendingUp,
  Truck,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIAS, type Categoria } from "@/lib/constants";

// Drawn from the real category vocabulary the matching engine uses
// (CATEGORIAS in lib/constants.ts), not fabricated company logos — we have
// no verified data on which employers hired through TurboTrabajo, so we
// show category breadth instead of a misleading "trusted by" brand strip.
// The exhaustive Record makes adding a category without an icon a type error.
const CATEGORY_ICONS: Record<Categoria, LucideIcon> = {
  "Administración y Oficina": Briefcase,
  "Atención al Cliente": Headphones,
  "Comercial y Ventas": TrendingUp,
  Construcción: HardHat,
  "Contabilidad y Finanzas": Calculator,
  Educación: GraduationCap,
  "Gastronomía y Turismo": UtensilsCrossed,
  "Gerencia y Dirección": Building2,
  "Logística y Bodega": Package,
  "Marketing y Comunicaciones": Megaphone,
  Minería: Mountain,
  "Operarios y Producción": Factory,
  "Recursos Humanos": Users,
  Salud: HeartPulse,
  "Tecnología e Informática": Laptop,
  Transporte: Truck,
};

export function TrustedBy() {
  return (
    <section className="border-y border-border bg-card py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="text-center text-xs font-bold tracking-wide text-muted-foreground uppercase">
          Empleos activos en las 16 categorías del mercado chileno
        </p>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          {CATEGORIAS.map((category) => {
            const Icon = CATEGORY_ICONS[category];
            return (
              <li
                key={category}
                className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                <Icon className="size-3.5 text-brand-violet" />
                {category}
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Empleos reales agregados desde portales de empleo chilenos.
        </p>
      </div>
    </section>
  );
}
