import type { Metadata } from "next";
import Script from "next/script";
import { PortalClientProvider } from "@/components/PortalClientProvider";
import { LenisProvider } from "@/components/LenisProvider";
import { LangProvider } from "@/lib/LangContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poised",
  description: "Simulador de entrevistas técnicas con presión real",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preload" href="/ne_110m_land.json" as="fetch" crossOrigin="anonymous" />
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <LangProvider>
          <LenisProvider>
            <PortalClientProvider>{children}</PortalClientProvider>
          </LenisProvider>
        </LangProvider>
      </body>
    </html>
  );
}
