"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { ApplyError, applyToListingViaServer, checkOptInGate } from "@/lib/applications";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Zap } from "lucide-react";
import type { MatchedListing } from "@/lib/types";
import { toast } from "sonner";

/**
 * One-click apply to all currently shown matches. Human-in-the-loop: opens a
 * confirmation showing how many applications (and tokens) it will use, capped by
 * the wallet's available balance, and skips listings already applied to. There is
 * no background scheduling — the user confirms every batch.
 */
export function ApplyAllButton({ listings }: { listings: MatchedListing[] }) {
  const { user, userDoc } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [plan, setPlan] = useState<MatchedListing[]>([]);

  const available = userDoc ? userDoc.wallet.balance - userDoc.wallet.reserved : 0;

  async function openDialog() {
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
    setPlan([]);
    setProgress(0);
    setLoadingPlan(true);
    setOpen(true);
    try {
      const snap = await getDocs(
        query(collection(db, "applications"), where("userId", "==", user.uid))
      );
      const appliedIds = new Set(snap.docs.map((d) => d.data().listingId as string));
      const notApplied = listings.filter((l) => !appliedIds.has(l.id));
      // Cap by available tokens so the batch never exceeds the user's balance.
      setPlan(notApplied.slice(0, Math.max(0, available)));
    } catch {
      toast.error("No pudimos preparar la postulación masiva.");
      setOpen(false);
    } finally {
      setLoadingPlan(false);
    }
  }

  async function runBatch() {
    if (!user || !userDoc) return;
    setRunning(true);
    setProgress(0);
    let done = 0;
    try {
      const idToken = await user.getIdToken();
      for (const listing of plan) {
        try {
          await applyToListingViaServer(idToken, listing.id);
          done += 1;
        } catch (error) {
          // A duplicate just means the pre-check list was stale — skip it and
          // keep going; any other server rejection stops the batch honestly.
          if (!(error instanceof ApplyError && error.code === "duplicate")) throw error;
        }
        setProgress(done);
      }
      toast.success(
        `Postulamos a ${done} ${done === 1 ? "empleo" : "empleos"} por ti (${done} ${
          done === 1 ? "token" : "tokens"
        }).`
      );
      setOpen(false);
      router.refresh();
    } catch (error) {
      const detail = error instanceof ApplyError ? ` ${error.message}` : "";
      toast.error(`Alcanzamos a postular a ${done} antes de un error.${detail}`);
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Button variant="outline" onClick={openDialog} disabled={listings.length === 0}>
        <Zap />
        Postular a todos
      </Button>

      <Dialog open={open} onOpenChange={(next) => !running && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Postular a varios empleos</DialogTitle>
            <DialogDescription>
              {loadingPlan
                ? "Preparando la lista…"
                : plan.length === 0
                  ? "No hay empleos nuevos para postular en esta lista (o no te quedan tokens)."
                  : `Vamos a postular a ${plan.length} ${
                      plan.length === 1 ? "empleo" : "empleos"
                    } usando ${plan.length} ${
                      plan.length === 1 ? "token" : "tokens"
                    } de tus ${available} disponibles.`}
            </DialogDescription>
          </DialogHeader>

          {running && (
            <div className="space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-brand-paleblue">
                <div
                  className="h-full rounded-full bg-brand-coral transition-all duration-200"
                  style={{ width: `${plan.length ? (progress / plan.length) * 100 : 0}%` }}
                />
              </div>
              <p className="text-xs text-brand-navy/50">
                Postulando {progress} de {plan.length}…
              </p>
            </div>
          )}

          <DialogFooter>
            <DialogClose
              render={<Button variant="outline" disabled={running} />}
            >
              Cancelar
            </DialogClose>
            <Button onClick={runBatch} disabled={running || loadingPlan || plan.length === 0}>
              {running ? "Postulando…" : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
