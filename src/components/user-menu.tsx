"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, FileText, HelpCircle, LogOut, SlidersHorizontal, Wallet } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initialFrom(name: string | null, email: string): string {
  const source = name?.trim() || email;
  return source.charAt(0).toUpperCase();
}

export function UserMenu() {
  const { user, userDoc, signOut } = useAuth();
  const router = useRouter();

  if (!user || !userDoc) return null;

  const name = userDoc.displayName ?? user.displayName;
  const email = userDoc.email ?? user.email ?? "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 rounded-full border-2 border-border bg-white py-1 pr-2 pl-1 text-brand-navy transition-colors hover:border-brand-navy/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label="Abrir menú de cuenta"
      >
        <span className="flex size-7 items-center justify-center rounded-full bg-brand-coral text-sm font-extrabold text-white">
          {initialFrom(name, email)}
        </span>
        <ChevronDown className="size-4 text-brand-navy/60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="py-2">
          <p className="truncate text-sm font-bold text-foreground">{name ?? "Mi cuenta"}</p>
          <p className="truncate text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/preferences" />}>
          <SlidersHorizontal />
          Mis preferencias
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/cv" />}>
          <FileText />
          Mi CV
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/tokens" />}>
          <Wallet />
          Tokens
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/ayuda" />}>
          <HelpCircle />
          Ayuda y soporte
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={async () => {
            await signOut();
            router.replace("/login");
          }}
        >
          <LogOut />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
