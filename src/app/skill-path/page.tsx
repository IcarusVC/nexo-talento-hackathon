import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: { absolute: "Skill path · Talento, oportunidades y formación" },
  description: "Cuatro experiencias conectadas: candidato, reclutador, supervisor e institución formadora. Demostración con datos ficticios.",
  applicationName: "Skill path",
  robots: { index: false, follow: false },
};

export default function SkillPathPage() {
  redirect("/skill-path/producto");
}
