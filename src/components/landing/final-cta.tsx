import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/landing/brand-logo";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
      <div className="relative overflow-hidden rounded-[2rem] border border-brand-violet/20 bg-gradient-to-br from-brand-violet/15 via-brand-periwinkle/10 to-brand-teal/15 px-6 py-14 text-center sm:px-12">
        <BrandMark
          gradientId="tt-final-cta-gradient"
          className="mx-auto size-12"
        />
        <h2 className="text-balance mx-auto mt-5 max-w-2xl text-3xl font-bold text-foreground sm:text-4xl">
          Tu próxima entrevista está más cerca de lo que crees
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
          Crea tu cuenta gratis, sube tu CV y deja que TurboTrabajo postule por ti
          desde hoy.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="shadow-puffy"
            nativeButton={false}
            render={<Link href="/register" />}
          >
            Crear cuenta gratis
            <ArrowRight className="size-4" data-icon="inline-end" />
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            Sin tarjeta de crédito · Cancela cuando quieras
          </p>
        </div>
      </div>
    </section>
  );
}
