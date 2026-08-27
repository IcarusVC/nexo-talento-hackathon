"use client";

import Link from "next/link";
import { Accordion } from "@base-ui/react/accordion";
import { ChevronDown, Mail, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FAQS = [
  {
    question: "¿Cómo postula TurboTrabajo por mí?",
    answer:
      "Completas tu perfil con tus regiones, categorías y expectativas, y te mostramos solo los empleos que calzan. Eliges a cuáles postular y nosotros enviamos la postulación por ti. Cada postulación usa 1 token.",
  },
  {
    question: "¿Qué son los tokens y cuánto cuestan?",
    answer:
      "Un token = una postulación. Al crear tu cuenta recibes 5 tokens de prueba. Cuando se acaban, puedes comprar más desde la sección Tokens. No hay suscripción ni cobros recurrentes: pagas solo por las postulaciones que usas.",
  },
  {
    question: "¿Por qué necesito tener mi CV aprobado antes de postular?",
    answer:
      "Nuestro equipo revisa y mejora tu CV en menos de 24 horas. Postulamos con la versión que tú apruebas, para que cada postulación tenga la mejor presentación posible.",
  },
  {
    question: "¿En qué regiones de Chile funciona?",
    answer:
      "Cubrimos las 16 regiones de Chile. Eliges tus regiones de interés en tus preferencias y solo te mostramos empleos que calzan con ellas.",
  },
  {
    question: "¿Puedo retirar una postulación?",
    answer:
      "Sí. Mientras una postulación esté en estado 'Pendiente de envío' puedes retirarla desde el detalle de la postulación en 'Mis postulaciones'.",
  },
];

export default function AyudaPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <p className="eyebrow mb-1">✦ Estamos para ayudarte</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">Centro de ayuda</h1>
        <p className="mt-1 text-sm text-brand-navy/60">
          Encuentra respuestas rápidas o escríbenos si necesitas algo más.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <Mail className="size-5 text-brand-coral" />
            <CardTitle className="text-base font-extrabold text-brand-navy">Escríbenos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-brand-navy/70">
              Respondemos por correo en menos de 24 horas hábiles.
            </p>
            <a
              href="mailto:soporte@turbotrabajo.cl"
              className="mt-2 inline-block text-sm font-bold text-brand-coral hover:underline"
            >
              soporte@turbotrabajo.cl
            </a>
          </CardContent>
        </Card>
        <Card className="border-2 border-border">
          <CardHeader className="flex flex-row items-center gap-2">
            <MessageCircle className="size-5 text-brand-coral" />
            <CardTitle className="text-base font-extrabold text-brand-navy">Tu cuenta</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-brand-navy/70">
              ¿Quieres ajustar a qué empleos postulamos? Edita tus{" "}
              <Link href="/preferences" className="font-bold text-brand-coral hover:underline">
                preferencias
              </Link>{" "}
              cuando quieras.
            </p>
          </CardContent>
        </Card>
      </div>

      <section id="faq" className="scroll-mt-24">
        <h2 className="text-xl font-black tracking-tight text-brand-navy">Preguntas frecuentes</h2>
        <Accordion.Root className="mt-4 flex flex-col gap-3">
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
      </section>

      <section id="nosotros" className="scroll-mt-24">
        <h2 className="text-xl font-black tracking-tight text-brand-navy">Sobre TurboTrabajo</h2>
        <p className="mt-2 text-sm leading-6 text-brand-navy/70">
          TurboTrabajo nació para quitarte la parte tediosa de buscar empleo: llenar el mismo
          formulario una y otra vez. Te mostramos solo los empleos que calzan con tu perfil y
          postulamos por ti con un CV mejorado por nuestro equipo. Hecho en Chile, para Chile.
        </p>
      </section>
    </div>
  );
}
