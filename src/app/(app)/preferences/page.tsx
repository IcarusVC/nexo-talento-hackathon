"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ProfileForm } from "@/components/profile-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function PreferencesPage() {
  const { userDoc } = useAuth();
  const router = useRouter();

  if (!userDoc) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="eyebrow mb-1">✦ Tu perfil</p>
        <h1 className="text-3xl font-black tracking-tight text-brand-navy">Preferencias</h1>
        <p className="mt-1 text-sm text-brand-navy/60">
          Ajusta tus regiones, categorías y filtros. Los empleos que te mostramos se
          recalculan con estos datos.
        </p>
      </div>

      <Card className="border-2 border-border">
        <CardHeader>
          <CardTitle className="text-base font-extrabold text-brand-navy">
            Datos de búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            initialProfile={userDoc.profile}
            submitLabel="Guardar cambios"
            onSaved={() => {
              toast.success("Preferencias actualizadas.");
              router.push("/dashboard");
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
