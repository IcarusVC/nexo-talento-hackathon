"use client";

import Link from "next/link";
import { ArrowRight, MapPinned, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroMockup } from "@/components/landing/hero-mockup";

const TRUST_POINTS = [
  { icon: Zap, label: "25.000+ empleos activos" },
  { icon: MapPinned, label: "16 regiones de Chile" },
  { icon: ShieldCheck, label: "Datos protegidos" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 -top-24 h-[560px] bg-gradient-to-r from-brand-violet/15 via-brand-periwinkle/15 to-brand-teal/15"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-16 sm:px-6 sm:pt-14 lg:grid-cols-2 lg:gap-10 lg:pt-16">
        <div className="flex flex-col items-center gap-5 text-center sm:gap-6 lg:items-start lg:text-left">
          <h1 className="text-balance text-[2.5rem] leading-[1.05] font-bold text-foreground sm:text-[3.5rem] sm:leading-[1.02]">
            Deja de Postular por Semanas
            <br />
            <span className="text-gradient-brand">Entrevistas en Días</span>
          </h1>

          <p className="max-w-xl text-lg leading-7 text-muted-foreground">
            TurboTrabajo encuentra empleos compatibles con tu perfil, postula por ti
            automáticamente y te ayuda a prepararte — para que pases de enviar
            postulaciones a conseguir entrevistas, rápido.
          </p>

          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="shadow-puffy"
              nativeButton={false}
              render={<Link href="/register" />}
            >
              Empezar ahora
              <ArrowRight className="size-4" data-icon="inline-end" />
            </Button>
            <p className="text-sm font-medium text-muted-foreground">
              Gratis para empezar · Sin tarjeta de crédito
            </p>
          </div>

          <ul className="mt-1 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
            {TRUST_POINTS.map((point) => (
              <li
                key={point.label}
                className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
              >
                <point.icon className="size-4 text-brand-violet" />
                {point.label}
              </li>
            ))}
          </ul>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
