export interface PricingPlan {
  key: "free" | "starter" | "pro" | "business";
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    key: "free",
    name: "Free",
    price: "0 €",
    priceNote: "/ Monat",
    description: "Zum Ausprobieren für kleine Betriebe mit wenigen Anfragen.",
    features: [
      "5 Anfragen pro Monat",
      "1 öffentliche Anfrageseite",
      "Antwortgenerator (Templates)",
      "Angebotsgenerator inkl. PDF-Export",
    ],
    cta: "Kostenlos starten",
  },
  {
    key: "starter",
    name: "Starter",
    price: "9 €",
    priceNote: "/ Monat",
    description: "Für Betriebe, die regelmäßig neue Anfragen erhalten.",
    features: [
      "Unbegrenzte Anfragen",
      "Erinnerungen für Follow-ups",
      "Logo & Branding auf der Anfrageseite",
      "E-Mail-Support",
    ],
    cta: "Starter wählen",
    highlighted: true,
  },
  {
    key: "pro",
    name: "Pro",
    price: "19 €",
    priceNote: "/ Monat",
    description: "Für Teams und Betriebe mit hohem Anfragevolumen.",
    features: [
      "Alles aus Starter",
      "Erweiterte Auswertungen",
      "Kalender (bald verfügbar)",
      "Priorisierter Support",
    ],
    cta: "Pro wählen",
    highlighted: true,
  },
  {
    key: "business",
    name: "Business",
    price: "39 €",
    priceNote: "/ Monat",
    description: "Für wachsende Betriebe mit mehreren Mitarbeitenden.",
    features: [
      "Alles aus Pro",
      "Mehrere Teammitglieder (bald verfügbar)",
      "Erweitertes Speicherlimit",
      "Persönlicher Ansprechpartner",
    ],
    cta: "Business wählen",
  },
];
