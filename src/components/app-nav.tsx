"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { UserMenu } from "@/components/user-menu";
import { NotificationsBell } from "@/components/notifications-bell";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Empleos" },
  { href: "/applications", label: "Mis postulaciones" },
  { href: "/cv", label: "Mi CV" },
  { href: "/tokens", label: "Tokens" },
];

export function AppNav() {
  const pathname = usePathname();
  const { userDoc } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const available = userDoc ? userDoc.wallet.balance - userDoc.wallet.reserved : null;

  return (
    <header className="bg-card">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 text-lg font-extrabold text-brand-navy"
        >
          Turbo
          <span className="text-brand-coral">Trabajo</span>
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Navegación principal">
          {links.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-bold text-brand-navy/70 transition-colors hover:bg-brand-paleblue/40 hover:text-brand-navy",
                  active && "bg-brand-paleblue text-brand-navy"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {available !== null && (
            <Link
              href="/tokens"
              className="rounded-full bg-brand-orange px-3 py-1.5 text-xs font-extrabold text-white"
              aria-label={`${available} tokens disponibles`}
            >
              {available} {available === 1 ? "token" : "tokens"}
            </Link>
          )}
          <NotificationsBell />
          <UserMenu />
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            className="flex size-9 items-center justify-center rounded-full border-2 border-border bg-card text-brand-navy transition-colors hover:border-brand-navy/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:hidden"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-border md:hidden"
          aria-label="Navegación principal"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-2">
            {links.map((link) => {
              const active = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-xl px-4 py-2.5 text-sm font-bold text-brand-navy/70 transition-colors hover:bg-brand-paleblue/40 hover:text-brand-navy",
                    active && "bg-brand-paleblue text-brand-navy"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </header>
  );
}
