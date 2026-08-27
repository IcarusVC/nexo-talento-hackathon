"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useNotifications } from "@/lib/use-notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function NotificationsBell() {
  const { items, unreadCount, markAllRead, seen } = useNotifications();

  return (
    <DropdownMenu onOpenChange={(open) => open && unreadCount > 0 && markAllRead()}>
      <DropdownMenuTrigger
        className="relative flex size-9 items-center justify-center rounded-full border-2 border-border bg-white text-brand-navy transition-colors hover:border-brand-navy/40 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        aria-label={
          unreadCount > 0 ? `Notificaciones, ${unreadCount} sin leer` : "Notificaciones"
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-brand-coral px-1 text-[10px] font-extrabold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="py-2 text-sm font-bold text-foreground">
          Notificaciones
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            No tienes notificaciones por ahora.
          </p>
        ) : (
          items.map((item) => (
            <DropdownMenuItem key={item.id} render={<Link href={item.href} />} className="py-2">
              <span className="flex flex-col gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                  {!seen.has(item.id) && (
                    <span className="size-1.5 shrink-0 rounded-full bg-brand-coral" aria-hidden />
                  )}
                  {item.title}
                </span>
                {item.body && (
                  <span className="line-clamp-1 text-xs text-muted-foreground">{item.body}</span>
                )}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
