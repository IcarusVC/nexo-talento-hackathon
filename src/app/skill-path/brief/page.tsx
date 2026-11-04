import type { Metadata } from "next";
import Link from "next/link";
import { SkillPathWorkspace } from "@/components/skill-path/workspace";

export const metadata: Metadata = {
  title: { absolute: "Skill path · Prueba original" },
  robots: { index: false, follow: false },
};

export default function BriefPage() {
  return <><div style={{ padding: "10px 24px", background: "#e7f1ef", color: "#173f3d", fontSize: 14 }}>Caso original del brief · <Link href="/skill-path/producto">Ir a las cuatro experiencias de Skill path</Link></div><SkillPathWorkspace /></>;
}
