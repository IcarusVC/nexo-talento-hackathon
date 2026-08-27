"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { authErrorMessage } from "@/lib/auth-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkle } from "@/components/sparkle";
import { toast } from "sonner";

export default function LoginPage() {
  const { user, signInWithEmail, signInWithGoogle, resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Land the user in the app once authenticated — also completes the Google
  // redirect fallback, which returns to this page instead of resolving inline.
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmail(email, password);
      router.replace("/dashboard");
    } catch (err) {
      toast.error(authErrorMessage(err, "login"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      toast.error(authErrorMessage(err, "login"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      toast.error("Escribe tu correo arriba y luego toca Restablecer.");
      return;
    }
    try {
      await resetPassword(email.trim());
      // Enumeration-safe: same message whether or not the account exists.
      toast.success(
        "Si existe una cuenta con ese correo, te enviamos un enlace para crear una nueva contraseña."
      );
    } catch (err) {
      toast.error(authErrorMessage(err, "reset"));
    }
  }

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-brand-yellow px-4 py-16">
      <Sparkle className="absolute top-10 left-[8%] size-8 text-brand-navy/20" />
      <Sparkle className="absolute bottom-16 left-[18%] size-5 text-brand-coral/40" />
      <Sparkle className="absolute top-20 right-[12%] size-6 text-brand-navy/20" />
      <Sparkle className="absolute bottom-24 right-[20%] size-9 text-brand-coral/30" />

      <div className="relative z-10 w-full max-w-sm rounded-3xl border-2 border-brand-navy bg-white p-8 shadow-[0_8px_0_0_rgba(22,38,75,0.15)]">
        <p className="eyebrow mb-2">✦ Bienvenido de nuevo</p>
        <h1 className="mb-6 text-3xl font-black tracking-tight text-brand-navy">
          Inicia sesión
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-brand-navy">
              Correo electrónico
            </Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-brand-navy">
                Contraseña
              </Label>
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-bold text-brand-coral hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            Iniciar sesión
          </Button>
        </form>

        <div className="relative my-5 text-center text-xs font-bold text-brand-navy/40">
          <span className="relative z-10 bg-white px-2">o</span>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
        </div>

        <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={submitting}>
          Continuar con Google
        </Button>

        <p className="mt-6 text-center text-sm text-brand-navy/70">
          ¿No tienes cuenta?{" "}
          <Link href="/register" className="font-bold text-brand-coral underline">
            Regístrate
          </Link>
        </p>
      </div>
    </div>
  );
}
