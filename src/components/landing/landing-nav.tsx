"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/landing/brand-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TOOLS = [
  { label: "Aplicar Auto", href: "/dashboard" },
  { label: "Creador de CV con IA", href: "/cv" },
  { label: "Carta IA", href: "#proximamente" },
  { label: "Entrevista Simulada", href: "#proximamente" },
  { label: "Interview Buddy", href: "#proximamente" },
  { label: "Traductor de CV", href: "#proximamente" },
];

export function LandingNav() {
  return (
    <header className="relative z-20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-5 sm:gap-4 sm:px-6">
        {/* Below sm the wordmark would collide with the auth buttons, so the
            isotype carries the brand alone. */}
        <Link href="/" aria-label="TurboTrabajo — inicio">
          <BrandLogo wordmarkClassName="hidden sm:inline" />
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-200 ease-(--ease-decelerate) hover:bg-tint hover:text-foreground"
            >
              Herramientas IA
              <ChevronDown className="size-3.5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              {TOOLS.map((tool) => (
                <DropdownMenuItem key={tool.label} render={<Link href={tool.href} />}>
                  {tool.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Link
            href="#como-funciona"
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-200 ease-(--ease-decelerate) hover:bg-tint hover:text-foreground"
          >
            Cómo funciona
          </Link>
          <Link
            href="#ejemplos-cv"
            className="rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors duration-200 ease-(--ease-decelerate) hover:bg-tint hover:text-foreground"
          >
            Ejemplos de CV
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/login" />}>
            Iniciar sesión
          </Button>
          <Button size="sm" nativeButton={false} render={<Link href="/register" />}>
            Registrarse
          </Button>
        </div>
      </div>
    </header>
  );
}
