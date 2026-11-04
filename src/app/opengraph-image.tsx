import { ImageResponse } from "next/og";

export const alt = "Skill path — Seguimiento de postulaciones con evidencia y revisión humana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f4f7f8", color: "#172d34", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", fontSize: 48, fontWeight: 700, color: "#006b5f" }}>Skill path</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div style={{ display: "flex", fontSize: 66, fontWeight: 700 }}>Cada postulación, con su historia.</div>
        <div style={{ display: "flex", fontSize: 30, color: "#4d626b" }}>Evidencia visible. Alcances claros. Revisión humana.</div>
      </div>
      <div style={{ display: "flex", fontSize: 24, color: "#4d626b" }}>Talent Tech Hack 2026 · MVP con datos sintéticos</div>
    </div>,
    { ...size }
  );
}
