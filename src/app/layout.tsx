import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

// Outfit is a variable font (weight axis 100–900), so we load the axis once
// rather than enumerating discrete weights.
const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const SITE_DESCRIPTION =
  "TurboTrabajo encuentra empleos compatibles con tu perfil entre 25.000+ ofertas en las 16 regiones de Chile, postula por ti con un clic y te ayuda a prepararte para la entrevista.";

export const metadata: Metadata = {
  metadataBase: new URL("https://turbotrabajo.vercel.app"),
  title: {
    default: "TurboTrabajo — Postula a empleos en Chile con un clic",
    template: "%s · TurboTrabajo",
  },
  description: SITE_DESCRIPTION,
  applicationName: "TurboTrabajo",
  openGraph: {
    type: "website",
    locale: "es_CL",
    url: "/",
    siteName: "TurboTrabajo",
    title: "TurboTrabajo — Postula a empleos en Chile con un clic",
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "TurboTrabajo — Postula a empleos en Chile con un clic",
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
        <AuthProvider>{children}</AuthProvider>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
