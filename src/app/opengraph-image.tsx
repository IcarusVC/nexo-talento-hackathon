import { ImageResponse } from "next/og";
import { BOLT_PATH } from "@/components/landing/brand-logo";

export const alt =
  "TurboTrabajo — postula a empleos en Chile con un clic y consigue entrevistas en días";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Shared-link card. Colors mirror the :root brand tokens in globals.css;
// they're hardcoded because ImageResponse renders outside the CSS cascade.
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(135deg, #1a1530 0%, #241b4d 55%, #143d3f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 72,
              height: 72,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 20,
              background:
                "linear-gradient(135deg, #6c4be6 0%, #9a86f2 55%, #14b8a6 100%)",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24">
              <path d={BOLT_PATH} fill="#ffffff" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700 }}>
            <span>Turbo</span>
            <span style={{ color: "#9a86f2" }}>Trabajo</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
            }}
          >
            Deja de postular por semanas.
          </div>
          <div
            style={{
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: -2,
              color: "#2dd4bf",
            }}
          >
            Entrevistas en días.
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {["25.000+ empleos", "16 regiones de Chile", "Postula con un clic"].map(
            (chip) => (
              <div
                key={chip}
                style={{
                  display: "flex",
                  padding: "12px 24px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.25)",
                  background: "rgba(255,255,255,0.08)",
                  fontSize: 26,
                }}
              >
                {chip}
              </div>
            )
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
