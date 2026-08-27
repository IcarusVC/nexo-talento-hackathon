import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { CV_STATUSES } from "@/lib/constants";
import { hasUploadedCv } from "@/lib/cv";
import type { UserDoc } from "@/lib/types";

interface Tip {
  text: string;
  href: string;
  cta: string;
}

/**
 * "Acciones recomendadas": surfaces the next best step from the user's current
 * state (CV status, profile completeness, token balance) to reduce dead space
 * and guide the user toward being able to apply.
 */
function buildTips(userDoc: UserDoc, completeness: number, matches: number | null): Tip[] {
  const tips: Tip[] = [];
  const available = userDoc.wallet.balance - userDoc.wallet.reserved;

  if (userDoc.cv.status === CV_STATUSES.MEJORADO_POR_REVISAR) {
    tips.push({ text: "Tu CV mejorado está listo para que lo revises.", href: "/cv", cta: "Revisar CV" });
  } else if (!hasUploadedCv(userDoc.cv)) {
    tips.push({
      text: "Sube tu CV para que lo mejoremos. Lo necesitas aprobado para postular.",
      href: "/cv",
      cta: "Subir mi CV",
    });
  } else if (userDoc.cv.status === CV_STATUSES.CAMBIOS_SOLICITADOS) {
    tips.push({
      text: "El equipo está aplicando los cambios que pediste a tu CV.",
      href: "/cv",
      cta: "Ver estado",
    });
  } else if (userDoc.cv.status !== CV_STATUSES.APROBADO) {
    tips.push({
      text: "Tu CV está en manos del equipo. Te avisaremos cuando esté la versión mejorada.",
      href: "/cv",
      cta: "Ver estado",
    });
  }

  if (completeness < 100) {
    tips.push({
      text: "Completa tu perfil para recibir mejores coincidencias.",
      href: "/preferences",
      cta: "Completar perfil",
    });
  }

  if (available <= 3) {
    tips.push({
      text:
        available <= 0
          ? "Te quedaste sin tokens. Recarga para seguir postulando."
          : "Te quedan pocos tokens. Recarga para no quedarte sin postular.",
      href: "/tokens",
      cta: "Comprar tokens",
    });
  }

  if (matches === 0) {
    tips.push({
      text: "No hay empleos que calcen aún. Amplía tus regiones o categorías.",
      href: "/preferences",
      cta: "Ajustar preferencias",
    });
  }

  return tips.slice(0, 3);
}

export function DashboardTips({
  userDoc,
  completeness,
  matches,
}: {
  userDoc: UserDoc;
  completeness: number;
  matches: number | null;
}) {
  const tips = buildTips(userDoc, completeness, matches);
  if (tips.length === 0) return null;

  return (
    <div className="rounded-2xl border-2 border-brand-paleblue bg-brand-paleblue/20 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Lightbulb className="size-5 text-brand-coral" />
        <h2 className="text-sm font-extrabold tracking-wide text-brand-navy uppercase">
          Acciones recomendadas
        </h2>
      </div>
      <ul className="space-y-2">
        {tips.map((tip) => (
          <li key={tip.href + tip.cta} className="flex items-center justify-between gap-3">
            <span className="text-sm text-brand-navy/80">{tip.text}</span>
            <Link
              href={tip.href}
              className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-brand-coral hover:underline"
            >
              {tip.cta} <ArrowRight className="size-3.5" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
