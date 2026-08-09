import type { Metadata } from "next";
import { PortalClientProvider } from "@/components/PortalClientProvider";
import { LenisProvider } from "@/components/LenisProvider";
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
      </head>
      <body className="bg-zinc-950 text-zinc-100 antialiased">
        <LenisProvider>
          <PortalClientProvider>{children}</PortalClientProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
