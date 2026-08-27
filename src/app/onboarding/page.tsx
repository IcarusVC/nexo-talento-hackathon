"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProfileForm } from "@/components/profile-form";
import { Sparkle } from "@/components/sparkle";

export default function OnboardingPage() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && userDoc?.profile) router.replace("/dashboard");
  }, [loading, user, userDoc, router]);

  return (
    <div className="relative flex flex-1 justify-center overflow-hidden bg-brand-yellow px-4 py-12">
      <Sparkle className="absolute top-12 left-[6%] size-7 text-brand-navy/20" />
      <Sparkle className="absolute bottom-10 right-[8%] size-8 text-brand-coral/30" />

      <div className="relative z-10 w-full max-w-2xl rounded-3xl border-2 border-brand-navy bg-white p-8 shadow-[0_8px_0_0_rgba(22,38,75,0.15)]">
        <p className="eyebrow mb-2">✦ Último paso</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">Completa tu perfil</h1>
        <p className="mt-1 mb-6 text-sm text-brand-navy/60">
          Usamos esta información para mostrarte solo los empleos que calzan contigo.
        </p>

        <ProfileForm
          submitLabel="Guardar y continuar"
          onSaved={() => router.replace("/dashboard")}
        />
      </div>
    </div>
  );
}
