import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Some scraped source feeds ship listing descriptions with literal HTML
 * (`<p>`, `<br />`) and markdown (`**`) in them. We render descriptions as
 * plain text (never dangerouslySetInnerHTML), so reduce them to readable text:
 * block-level tags become line breaks, everything else is stripped.
 */
export function cleanListingText(raw: string | null | undefined): string {
  if (!raw) return ""
  return (
    raw
      // Block-ish separators → newlines before tags are stripped.
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|li|ul|ol|h[1-6]|tr)\s*>/gi, "\n")
      .replace(/<\s*li\b[^>]*>/gi, "• ")
      // Any remaining tag.
      .replace(/<[^>]+>/g, " ")
      // Common HTML entities.
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#0?39;|&apos;/gi, "'")
      // Markdown emphasis markers — paired first, then any stray unpaired
      // runs (feeds ship things like "Perfil deseado**" with no opener).
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
      .replace(/_{2,3}([^_]+)_{2,3}/g, "$1")
      .replace(/\*{2,}/g, "")
      .replace(/_{2,}/g, "")
      .replace(/^#{1,6}\s+/gm, "")
      // Tidy whitespace.
      .replace(/[ \t]+/g, " ")
      .replace(/ ?\n ?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  )
}
