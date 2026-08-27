import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void };
}

/** Shared actionable empty state: icon + message + a clear next step. */
export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-border bg-card/50 px-6 py-12 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-paleblue text-brand-coral">
        <Icon className="size-7" />
      </span>
      <div>
        <h3 className="text-base font-extrabold text-brand-navy">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-brand-navy/60">{description}</p>
      </div>
      {action &&
        (action.href ? (
          <Button nativeButton={false} render={<Link href={action.href} />}>
            {action.label}
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        ))}
    </div>
  );
}
