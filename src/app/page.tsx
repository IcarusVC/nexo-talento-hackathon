"use client";

export const dynamic = "force-dynamic";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LandingPage } from "@/components/landing/landing-page";

export default function Home() {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (!userDoc?.profile) {
      router.replace("/onboarding");
    } else {
      router.replace("/dashboard");
    }
  }, [user, userDoc, loading, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-muted-foreground">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="flex flex-1 items-center justify-center py-24 text-sm text-muted-foreground">
      Cargando...
    </div>
  );
}
