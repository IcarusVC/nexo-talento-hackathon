import { ImageResponse } from "next/og";
import { BOLT_PATH } from "@/components/landing/brand-logo";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS applies its own corner mask, so the tile is full-bleed (no radius).
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6c4be6 0%, #9a86f2 55%, #14b8a6 100%)",
        }}
      >
        <svg width="112" height="112" viewBox="0 0 24 24">
          <path d={BOLT_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
