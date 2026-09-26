import type { IndustryKey } from "@/types/database";

export interface IndustryRecommendation {
  /** Keywords matched (case-insensitive) against Leistung/Beschreibung. */
  keywords: string[];
  /** Empfehlungssatz, der in die generierte Antwort eingebaut wird. */
  text: string;
}

export interface IndustryDefinition {
  key: IndustryKey;
  label: string;
  /** Beispiel-Leistungen fuer das oeffentliche Anfrageformular. */
  exampleServices: string[];
  recommendations: IndustryRecommendation[];
  defaultRecommendation: string;
  /** Beispielprodukt fuer eine erste Angebotszeile im Angebotsgenerator. */
  quoteSuggestion: { title: string; price: number };
}

export const INDUSTRIES: Record<IndustryKey, IndustryDefinition> = {
  autopflege: {
    key: "autopflege",
    label: "Autopflege",
    exampleServices: [
      "Innen- und Aussenreinigung",
      "Lackversiegelung",
      "Politur & Lackaufbereitung",
      "Innenraum-Tiefenreinigung",
      "Motorraumreinigung",
    ],
    recommendations: [
      {
        keywords: ["versiegel", "politur", "lack"],
        text: "eine Lackaufbereitung mit anschliessender Versiegelung, damit der Lack langfristig geschuetzt ist",
      },
      {
        keywords: ["innen", "polster", "sitz", "geruch"],
        text: "eine Innenraum-Tiefenreinigung inklusive Polster- und Teppichshampoo",
      },
      {
        keywords: ["motor"],
        text: "eine schonende Motorraumreinigung in Kombination mit der Aussenreinigung",
      },
    ],
    defaultRecommendation: "eine gruendliche Innen- und Aussenreinigung mit anschliessender Politur",
    quoteSuggestion: { title: "Fahrzeugaufbereitung Komplett", price: 149 },
  },
  reinigung: {
    key: "reinigung",
    label: "Reinigung",
    exampleServices: [
      "Büroreinigung",
      "Praxisreinigung",
      "Umzugs- / Endreinigung",
      "Fensterreinigung",
      "Grundreinigung",
    ],
    recommendations: [
      {
        keywords: ["umzug", "end", "übergabe"],
        text: "eine Umzugs-Endreinigung inklusive Fenster, damit die Wohnung uebergabefertig ist",
      },
      {
        keywords: ["büro", "praxis", "gewerbe"],
        text: "eine regelmaessige Unterhaltsreinigung mit flexiblem Wochenrhythmus",
      },
      {
        keywords: ["fenster"],
        text: "eine professionelle Fensterreinigung inklusive Rahmen und Fensterbaenke",
      },
    ],
    defaultRecommendation: "eine gruendliche Grundreinigung nach individuellem Reinigungsplan",
    quoteSuggestion: { title: "Reinigung (Einmalig)", price: 180 },
  },
  gartenservice: {
    key: "gartenservice",
    label: "Gartenservice",
    exampleServices: [
      "Rasenpflege",
      "Heckenschnitt",
      "Baumschnitt",
      "Gartenneuanlage",
      "Laubentfernung",
    ],
    recommendations: [
      {
        keywords: ["hecke"],
        text: "einen fachgerechten Heckenschnitt inklusive Abtransport des Grünschnitts",
      },
      {
        keywords: ["baum"],
        text: "einen Baumschnitt nach aktuellem Pflegezustand inklusive Entsorgung des Schnittguts",
      },
      {
        keywords: ["rasen"],
        text: "eine regelmaessige Rasenpflege inklusive Vertikutieren und Duengen",
      },
    ],
    defaultRecommendation: "einen Pflegetermin, bei dem wir uns Hecke, Rasen und Beete gemeinsam ansehen",
    quoteSuggestion: { title: "Gartenpflege (Einmalig)", price: 120 },
  },
  fotografie: {
    key: "fotografie",
    label: "Fotografie",
    exampleServices: [
      "Portraitfotografie",
      "Hochzeitsfotografie",
      "Business-/Bewerbungsfotos",
      "Event-Fotografie",
      "Produktfotografie",
    ],
    recommendations: [
      {
        keywords: ["hochzeit"],
        text: "eine ganztägige Hochzeitsbegleitung inklusive Vorbereitung, Trauung und Feier",
      },
      {
        keywords: ["business", "bewerbung", "linkedin"],
        text: "ein kurzes Business-Shooting mit 3-5 bearbeiteten Bildern zur Auswahl",
      },
      {
        keywords: ["event"],
        text: "eine Event-Begleitung mit flexibler Stundenanzahl je nach Programm",
      },
    ],
    defaultRecommendation: "ein unverbindliches Kennenlerngespraech, um den Rahmen des Shootings abzustecken",
    quoteSuggestion: { title: "Fotoshooting (Basis-Paket)", price: 249 },
  },
  handwerk: {
    key: "handwerk",
    label: "Handwerk",
    exampleServices: [
      "Renovierung",
      "Reparaturarbeiten",
      "Bad-/Küchensanierung",
      "Malerarbeiten",
      "Kleine Umbauten",
    ],
    recommendations: [
      {
        keywords: ["bad", "sanitär", "fliesen"],
        text: "einen Vor-Ort-Termin, um Umfang und Material fuer die Badsanierung genau zu planen",
      },
      {
        keywords: ["maler", "streich", "tapete"],
        text: "Malerarbeiten inklusive Untergrundvorbereitung und hochwertiger Farbe",
      },
      {
        keywords: ["reparatur"],
        text: "einen kurzfristigen Termin zur Begutachtung und Reparatur vor Ort",
      },
    ],
    defaultRecommendation: "einen Besichtigungstermin, um den genauen Aufwand realistisch einzuschaetzen",
    quoteSuggestion: { title: "Handwerkerleistung (nach Aufwand)", price: 65 },
  },
};

export const INDUSTRY_LIST = Object.values(INDUSTRIES);

export function getIndustry(key: string | null | undefined): IndustryDefinition {
  if (key && key in INDUSTRIES) {
    return INDUSTRIES[key as IndustryKey];
  }
  return INDUSTRIES.handwerk;
}

export function findRecommendation(industry: IndustryDefinition, text: string): string {
  const haystack = text.toLowerCase();
  for (const rec of industry.recommendations) {
    if (rec.keywords.some((kw) => haystack.includes(kw))) {
      return rec.text;
    }
  }
  return industry.defaultRecommendation;
}
