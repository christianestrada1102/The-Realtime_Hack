import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Poised",
  description: "Simulador de entrevistas técnicas con presión real",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-zinc-950 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
