"use client";

import { lazy, Suspense, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// Keep the research workspace independent of credentials, while retaining the
// original TurboTrabajo authentication flow for its existing routes.
const OriginalAuthProvider = lazy(() =>
  import("@/lib/auth-context").then((module) => ({ default: module.AuthProvider }))
);

export function PlatformProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/" || pathname === "/nexo" || pathname.startsWith("/nexo/") || pathname === "/skill-path" || pathname.startsWith("/skill-path/")) {
    return <>{children}</>;
  }
  return (
    <Suspense fallback={<div className="p-8 text-sm">Cargando acceso…</div>}>
      <OriginalAuthProvider>{children}</OriginalAuthProvider>
    </Suspense>
  );
}
