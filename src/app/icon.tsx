import { ImageResponse } from "next/og";
import { BOLT_PATH } from "@/components/landing/brand-logo";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// PNG (not SVG) so Safari — which still ignores SVG favicons — gets the brand
// mark too. Hex values mirror the :root brand tokens in globals.css.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 7,
          background: "linear-gradient(135deg, #6c4be6 0%, #9a86f2 55%, #14b8a6 100%)",
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24">
          <path d={BOLT_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
