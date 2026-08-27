"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  ApplyError,
  applyToListingViaServer,
  checkOptInGate,
  hasExistingApplication,
} from "@/lib/applications";
import type { Listing } from "@/lib/types";
import { toast } from "sonner";

/**
 * Shared, token-gated "Participar" button. Used by the listing card and the
 * listing detail page so the opt-in gate (token + approved CV) and the
 * duplicate-application guard live in exactly one place.
 */
export function ApplyButton({
  listing,
  className,
}: {
  listing: Listing;
  className?: string;
}) {
  const { user, userDoc } = useAuth();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleParticipar() {
    if (!user || !userDoc) return;
    const gate = checkOptInGate(userDoc);
    if (!gate.allowed) {
      toast.error(gate.reason, {
        action: gate.ctaHref
          ? { label: gate.ctaLabel ?? "Ir", onClick: () => router.push(gate.ctaHref!) }
          : undefined,
      });
      return;
    }

    setSubmitting(true);
    try {
      const already = await hasExistingApplication(user.uid, listing.id);
      if (already) {
        toast.info("Ya postulaste a este empleo.");
        return;
      }
      await applyToListingViaServer(await user.getIdToken(), listing.id);
      toast.success("¡Listo! Quedaste inscrito para este empleo. Usaste 1 token.");
      router.refresh();
    } catch (error) {
      if (error instanceof ApplyError && error.code === "duplicate") {
        toast.info(error.message);
      } else if (error instanceof ApplyError) {
        toast.error(error.message);
      } else {
        toast.error("No pudimos registrar tu postulación. Inténtalo de nuevo.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button onClick={handleParticipar} disabled={submitting} className={className}>
      Participar
    </Button>
  );
}
