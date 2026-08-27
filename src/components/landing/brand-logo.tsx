import { cn } from "@/lib/utils";

/**
 * Heroicons "bolt" (solid, 24×24, MIT) — the turbo mark. Shared with the
 * generated favicon/apple-icon/OG image so every surface renders the same
 * glyph.
 */
export const BOLT_PATH =
  "M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z";

/**
 * Rounded-square isotype: brand gradient + white bolt. Server-component safe
 * (no hooks); when the mark renders more than once per page the duplicated
 * gradient ids all point at identical definitions, so resolution to the first
 * one is harmless.
 */
export function BrandMark({
  className,
  gradientId = "tt-mark-gradient",
}: {
  className?: string;
  gradientId?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--brand-violet)" />
          <stop offset="0.55" stopColor="var(--brand-periwinkle)" />
          <stop offset="1" stopColor="var(--brand-teal)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
      <path d={BOLT_PATH} fill="#ffffff" transform="translate(4 4)" />
    </svg>
  );
}

/** Isotype + wordmark lockup used in the nav and footer. */
export function BrandLogo({
  className,
  markClassName,
  wordmarkClassName,
}: {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <BrandMark className={markClassName} />
      <span
        className={cn(
          "text-lg font-extrabold tracking-tight text-foreground",
          wordmarkClassName
        )}
      >
        Turbo<span className="text-brand-violet">Trabajo</span>
      </span>
    </span>
  );
}
