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
  "Nexo Talento conecta requisitos laborales, evidencia curricular y oportunidades de experiencia. Piloto construido sobre TurboTrabajo y Luk.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "Nexo Talento — Formación y oportunidades",
    template: "%s · Nexo Talento",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Nexo Talento",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "Nexo Talento",
    title: "Nexo Talento — Formación y oportunidades",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexo Talento — Formación y oportunidades",
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
