import type { Metadata } from "next";
import { Inter, Sora } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

// Alle Routen laufen im Edge-Runtime, damit die App unveraendert auf
// Cloudflare Pages (via @cloudflare/next-on-pages) deploybar bleibt.
export const runtime = "edge";

export const metadata: Metadata = {
  title: {
    default: "AnfragePilot – Nie wieder eine Kundenanfrage verlieren",
    template: "%s · AnfragePilot",
  },
  description:
    "AnfragePilot sammelt Kundenanfragen für lokale Dienstleister, macht sie übersichtlich und hilft dir, schneller zu antworten.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={`${inter.variable} ${sora.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
