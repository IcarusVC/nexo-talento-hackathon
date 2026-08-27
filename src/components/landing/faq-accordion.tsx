"use client";

import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown, MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

const FAQS = [
  {
    question: "¿Cómo postula TurboTrabajo por mí?",
    answer:
      "Tras completar tu perfil, buscamos empleos compatibles con tus regiones, categorías y expectativas, y te dejamos postular con un clic — sin tener que llenar el mismo formulario una y otra vez.",
  },
  {
    question: "¿TurboTrabajo es gratis?",
    answer:
      "Puedes empezar gratis y revisar tus primeras postulaciones sin costo. Si quieres acceso ilimitado, puedes suscribirte desde tu cuenta en cualquier momento.",
  },
  {
    question: "¿En qué regiones de Chile funciona?",
    answer:
      "Cubrimos las 16 regiones de Chile. Eliges tus regiones de interés durante el registro y solo te mostramos empleos que calzan con ellas.",
  },
  {
    question: "¿Necesito subir mi CV?",
    answer:
      "Sí — usamos tu CV y tus preferencias para calcular qué tan bien calza cada empleo con tu perfil antes de postular por ti.",
  },
];

/** Left-column companion so the FAQ doesn't float alone on desktop. */
function SupportCard() {
  return (
    <div className="flex h-fit flex-col items-start gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm lg:sticky lg:top-6">
      <div aria-hidden="true" className="flex w-full flex-col gap-2 rounded-xl bg-tint p-4">
        <div className="max-w-[80%] self-start rounded-xl rounded-bl-sm border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground">
          ¿Cómo funciona la postulación?
        </div>
        <div className="max-w-[80%] self-end rounded-xl rounded-br-sm bg-brand-violet px-3 py-1.5 text-xs font-semibold text-white">
          Con un clic. Te mostramos cómo →
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MessageCircleQuestion className="size-5 text-brand-violet" />
        <h3 className="text-base font-bold text-heading-slate">¿Tienes otra pregunta?</h3>
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        La forma más rápida de resolverla es probar TurboTrabajo tú mismo: crear tu
        cuenta es gratis y toma menos de dos minutos.
      </p>
      <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
        Crear cuenta gratis
      </Button>
    </div>
  );
}

export function FaqAccordion() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <h2 className="text-center text-3xl font-bold text-foreground sm:text-4xl">
        Preguntas frecuentes
      </h2>

      <div className="mt-10 grid gap-6 lg:grid-cols-[2fr_3fr] lg:items-start">
        <SupportCard />

        <Accordion.Root className="flex flex-col gap-3">
          {FAQS.map((faq) => (
            <Accordion.Item
              key={faq.question}
              className="rounded-2xl border border-border bg-tint-strong/40 px-5 py-1"
            >
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-3 py-4 text-left text-sm font-bold text-foreground">
                  {faq.question}
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-(--ease-decelerate) group-data-[panel-open]:rotate-180" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel className="h-(--accordion-panel-height) overflow-hidden text-sm leading-6 text-muted-foreground transition-all duration-200 ease-(--ease-decelerate) data-[ending-style]:h-0 data-[starting-style]:h-0">
                <p className="pb-4">{faq.answer}</p>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  );
}
