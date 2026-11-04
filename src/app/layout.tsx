import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { PlatformProviders } from "@/components/platform-providers";
import { Toaster } from "@/components/ui/sonner";

// Outfit is a variable font (weight axis 100–900), so we load the axis once
// rather than enumerating discrete weights.
const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "Skill path permite seguir postulaciones, comprender su evidencia y resolver casos con revisión humana. MVP con datos sintéticos de Talent Tech Hack 2026.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Skill path — Procesos claros, decisiones trazables",
    template: "%s · Skill path",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Skill path",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Skill path",
    title: "Skill path — Seguimiento de postulaciones",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Skill path — Seguimiento de postulaciones",
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CL" className={`${outfit.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-white">
        <PlatformProviders>{children}</PlatformProviders>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
