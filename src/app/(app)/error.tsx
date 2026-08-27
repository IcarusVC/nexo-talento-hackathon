"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-8" />
      </span>
      <h1 className="text-2xl font-black tracking-tight text-brand-navy">Algo salió mal</h1>
      <p className="text-sm text-brand-navy/60">
        Tuvimos un problema al cargar esta sección. Puedes reintentar o volver al inicio.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => unstable_retry()}>Reintentar</Button>
        <Button variant="outline" nativeButton={false} render={<Link href="/dashboard" />}>
          Volver a empleos
        </Button>
      </div>
    </div>
  );
}
