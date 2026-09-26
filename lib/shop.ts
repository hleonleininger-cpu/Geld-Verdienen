import type { IndustryKey } from "@/types/database";

export interface ShopProduct {
  slug: string;
  industry: IndustryKey;
  name: string;
  price: number;
  tagline: string;
  description: string;
  includes: string[];
}

export const SHOP_PRODUCTS: ShopProduct[] = [
  {
    slug: "autopflege-starter-pack",
    industry: "autopflege",
    name: "Autopflege Starter Pack",
    price: 49,
    tagline: "Sofort startklar für mobile Fahrzeugaufbereitung.",
    description:
      "Alles, was du brauchst, um dein Autopflege-Geschäft professionell zu präsentieren – inklusive vorkonfigurierter Anfrageseite und passender Antwortvorlagen.",
    includes: [
      "Vorkonfigurierte Anfrageseite für Autopflege",
      "5 Antwortvorlagen für typische Anfragen",
      "Beispiel-Preisliste zur Orientierung",
      "Checkliste für den ersten Kundentermin",
    ],
  },
  {
    slug: "reinigungsservice-starter-pack",
    industry: "reinigung",
    name: "Reinigungsservice Starter Pack",
    price: 49,
    tagline: "Professioneller Auftritt für Büro- und Privatreinigung.",
    description:
      "Starte mit einer klaren Struktur für Anfragen zu Büro-, Praxis- und Umzugsreinigungen – inklusive Textbausteinen für schnelle Antworten.",
    includes: [
      "Vorkonfigurierte Anfrageseite für Reinigungsservices",
      "Textbausteine für Büro- und Umzugsreinigung",
      "Beispiel-Angebotsvorlage",
      "Checkliste für Vor-Ort-Termine",
    ],
  },
  {
    slug: "gartenservice-starter-pack",
    industry: "gartenservice",
    name: "Gartenservice Starter Pack",
    price: 49,
    tagline: "Mehr Anfragen für Pflege- und Neuanlage-Aufträge.",
    description:
      "Zeig deinen Kunden von Anfang an, wie professionell du arbeitest – mit einer fertigen Anfrageseite und saisonalen Antwortvorlagen.",
    includes: [
      "Vorkonfigurierte Anfrageseite für Gartenservice",
      "Antwortvorlagen für Hecke, Rasen & Neuanlage",
      "Saisonale Angebots-Beispiele",
      "Checkliste für Baustellenbesichtigung",
    ],
  },
  {
    slug: "fotografie-starter-pack",
    industry: "fotografie",
    name: "Fotografie Starter Pack",
    price: 49,
    tagline: "Vom ersten Kontakt bis zum gebuchten Shooting.",
    description:
      "Eine stilvolle Anfrageseite für dein Fotostudio, kombiniert mit Antwortvorlagen für Hochzeit, Business und Events.",
    includes: [
      "Vorkonfigurierte Anfrageseite für Fotografie",
      "Antwortvorlagen für Hochzeit, Business & Event",
      "Beispiel-Angebotspakete",
      "Checkliste für das Erstgespräch",
    ],
  },
  {
    slug: "handwerker-starter-pack",
    industry: "handwerk",
    name: "Handwerker Starter Pack",
    price: 49,
    tagline: "Anfragen sauber sammeln statt Zettelwirtschaft.",
    description:
      "Für Handwerksbetriebe, die Renovierungs- und Reparaturanfragen professionell aufnehmen und schneller beantworten wollen.",
    includes: [
      "Vorkonfigurierte Anfrageseite für Handwerksleistungen",
      "Antwortvorlagen für Reparatur & Renovierung",
      "Beispiel-Angebot nach Aufwand",
      "Checkliste für die Baustellenbesichtigung",
    ],
  },
];

export function getShopProduct(slug: string) {
  return SHOP_PRODUCTS.find((p) => p.slug === slug) ?? null;
}
