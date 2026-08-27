import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-4">
          <Link href="/" className="flex items-center gap-1.5 text-lg font-extrabold text-brand-navy">
            Turbo
            <span className="text-brand-coral">Trabajo</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="text-6xl font-black tracking-tight text-brand-coral">404</p>
        <h1 className="text-2xl font-black tracking-tight text-brand-navy">
          No encontramos esta página
        </h1>
        <p className="text-sm text-brand-navy/60">
          Es posible que el enlace esté roto o que la página haya cambiado de lugar.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button nativeButton={false} render={<Link href="/dashboard" />}>
            Ir a mis empleos
          </Button>
          <Button variant="outline" nativeButton={false} render={<Link href="/" />}>
            Volver al inicio
          </Button>
        </div>
      </main>
    </div>
  );
}
