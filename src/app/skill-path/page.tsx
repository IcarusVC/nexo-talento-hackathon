import type { Metadata } from "next";
import { SkillPathWorkspace } from "@/components/skill-path/workspace";

export const metadata: Metadata = {
  title: { absolute: "Skill path · Seguimiento de postulaciones" },
  description: "Conoce qué ocurrió, qué falta confirmar y cuál es el siguiente paso de una postulación. Demostración con datos sintéticos y permisos por cuenta.",
  applicationName: "Skill path",
  robots: { index: false, follow: false },
};

export default function SkillPathPage() {
  return <SkillPathWorkspace />;
}
