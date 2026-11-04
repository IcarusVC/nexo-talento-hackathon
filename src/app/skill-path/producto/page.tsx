import type { Metadata } from "next";
import { SkillPathProduct } from "@/components/skill-path-product/workspace";

export const metadata: Metadata = { title: { absolute: "Skill path · Tu próximo paso profesional" }, description: "Perfiles con evidencia, oportunidades, selección y formación en una demostración de Skill path.", robots: { index: false, follow: false } };
export default function ProductPage() { return <SkillPathProduct />; }
