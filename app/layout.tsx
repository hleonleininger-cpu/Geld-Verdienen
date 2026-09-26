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

// Kein `export const runtime = "edge"` mehr: @opennextjs/cloudflare uebersetzt
// den regulaeren Node-kompatiblen Next.js-Build in einen Cloudflare Worker;
// die Edge-Runtime wird von diesem Adapter (Stand dieser Migration) nicht
// unterstuetzt. Siehe docs/DEPLOYMENT_ARCHITECTURE.md.

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const description =
  "AnfragePilot sammelt Kundenanfragen für lokale Dienstleister, macht sie übersichtlich und hilft dir, schneller zu antworten.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AnfragePilot – Nie wieder eine Kundenanfrage verlieren",
    template: "%s · AnfragePilot",
  },
  description,
  openGraph: {
    type: "website",
    locale: "de_DE",
    siteName: "AnfragePilot",
    title: "AnfragePilot – Nie wieder eine Kundenanfrage verlieren",
    description,
  },
  robots: {
    index: true,
    follow: true,
  },
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
