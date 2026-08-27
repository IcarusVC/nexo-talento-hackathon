"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { fetchMatchedListings } from "@/lib/matching";
import { JobsFeed } from "@/components/jobs-feed";
import { DashboardStats } from "@/components/dashboard-stats";
import { DashboardTips } from "@/components/dashboard-tips";
import { EmptyState } from "@/components/empty-state";
import { Sparkle } from "@/components/sparkle";
import { Skeleton } from "@/components/ui/skeleton";
import { SlidersHorizontal } from "lucide-react";
import { hasUploadedCv } from "@/lib/cv";
import type { ClientProfile, MatchedListing, UserDoc } from "@/lib/types";

const PROFILE_FIELDS = 8;

function profileFilledCount(profile: ClientProfile | null): number {
  if (!profile) return 0;
  let filled = 0;
  if (profile.regiones.length > 0) filled++;
  if (profile.comunas.length > 0) filled++;
  if (profile.categorias.length > 0) filled++;
  if (profile.contract_types.length > 0) filled++;
  if (profile.journada_pref) filled++;
  if (profile.salary_expectation_min != null) filled++;
  if (profile.skills.length > 0) filled++;
  if (profile.resumen.trim()) filled++;
  return filled;
}

/** Preferences fields only — drives the "completa tu perfil" tip. */
function preferencesCompleteness(profile: ClientProfile | null): number {
  return Math.round((profileFilledCount(profile) / PROFILE_FIELDS) * 100);
}

/**
 * The stat card counts the CV too: without it the card could read "100%
 * perfil completo" while the tips banner says a CV is still needed.
 */
function overallCompleteness(userDoc: UserDoc | null): number {
  if (!userDoc) return 0;
  const filled = profileFilledCount(userDoc.profile) + (hasUploadedCv(userDoc.cv) ? 1 : 0);
  return Math.round((filled / (PROFILE_FIELDS + 1)) * 100);
}

export default function DashboardPage() {
  const { user, userDoc } = useAuth();
  const [listings, setListings] = useState<MatchedListing[] | null>(null);
  const [applicationsCount, setApplicationsCount] = useState<number | null>(null);

  useEffect(() => {
    if (!userDoc?.profile) return;
    fetchMatchedListings(userDoc.profile)
      .then(setListings)
      // On error (e.g. Firestore unreachable / missing index) show the empty
      // state rather than an infinite skeleton.
      .catch(() => setListings([]));
  }, [userDoc]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "applications"), where("userId", "==", user.uid));
    return onSnapshot(
      q,
      (snap) => setApplicationsCount(snap.size),
      () => setApplicationsCount(0)
    );
  }, [user]);

  const completeness = overallCompleteness(userDoc);
  const prefsCompleteness = preferencesCompleteness(userDoc?.profile ?? null);
  const matches = listings?.length ?? null;

  return (
    <div className="space-y-8">
      <div className="hero-panel relative grid gap-6 overflow-hidden px-8 py-10 sm:grid-cols-[1fr_auto] sm:items-center">
        <Sparkle className="absolute top-6 right-10 size-7 text-brand-navy/20" />
        <Sparkle className="absolute bottom-6 left-10 size-5 text-white/40" />
        <div>
          <p className="eyebrow mb-2">✦ Hecho a tu medida</p>
          <h1 className="max-w-lg text-4xl font-black tracking-tight text-brand-navy sm:text-5xl">
            Empleos para ti
          </h1>
          <p className="mt-3 max-w-md text-base font-medium text-brand-navy/80">
            Estos empleos calzan con las regiones y categorías de tu perfil.
          </p>
        </div>
        <div className="relative z-10 mx-auto flex size-32 shrink-0 flex-col items-center justify-center rounded-full border-2 border-brand-navy bg-white text-center shadow-[0_6px_0_0_rgba(22,38,75,0.15)] sm:mx-0 sm:size-36">
          <span className="text-3xl font-black tracking-tight text-brand-coral sm:text-4xl">+25K</span>
          <span className="text-xs font-bold tracking-wide text-brand-navy/70 uppercase">
            empleos publicados
          </span>
        </div>
      </div>

      <DashboardStats applications={applicationsCount} matches={matches} completeness={completeness} />

      {userDoc && (
        <DashboardTips userDoc={userDoc} completeness={prefsCompleteness} matches={matches} />
      )}

      {listings === null && (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-2xl" />
          ))}
        </div>
      )}

      {listings !== null && listings.length === 0 && (
        <EmptyState
          icon={SlidersHorizontal}
          title="Aún no hay empleos que calcen con tu perfil"
          description="Amplía tus regiones o categorías y volveremos a buscar coincidencias para ti."
          action={{ label: "Ajustar preferencias", href: "/preferences" }}
        />
      )}

      {listings !== null && listings.length > 0 && <JobsFeed listings={listings} />}
    </div>
  );
}
