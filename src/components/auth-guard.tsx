"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/**
 * Wraps every authenticated page. Redirects to /login when signed out, and
 * forces the profile wizard at /onboarding until `users/{uid}.profile` exists.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userDoc, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (userDoc && !userDoc.profile) {
      router.replace("/onboarding");
    }
  }, [user, userDoc, loading, router]);

  if (loading || !user || !userDoc?.profile) {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm text-zinc-500">
        Cargando...
      </div>
    );
  }

  return <>{children}</>;
}
