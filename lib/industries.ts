import type { IndustryKey, QuoteLineItem, RequestFieldType } from "@/types/database";

export interface IndustryRecommendation {
  /** Keywords matched (case-insensitive) against Leistung/Beschreibung. */
  keywords: string[];
  /** Empfehlungssatz, der in die generierte Antwort eingebaut wird. */
  text: string;
}

export interface IndustryServiceTemplate {
  name: string;
  description?: string;
  price: number | null;
  duration_minutes: number | null;
}

export interface IndustryFormFieldTemplate {
  field_type: RequestFieldType;
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
}

export interface IndustryFaqItem {
  q: string;
  a: string;
}

export interface IndustryDefinition {
  key: IndustryKey;
  label: string;
  /** Kurzer Slogan-Vorschlag fuer Onboarding-Schritt 3 (nur Platzhalter, kein Autofill). */
  tagline: string;
  /** Beschreibungs-Vorschlag fuer Onboarding-Schritt 3 UND Fallback-Text auf der oeffentlichen Seite. */
  description: string;
  /** Beispiel-Leistungen (nur Namen) fuer das Anfrageformular-Select. */
  exampleServices: string[];
  /** Vollstaendige Standard-Leistungen, die beim Onboarding automatisch angelegt werden. */
  services: IndustryServiceTemplate[];
  /** Zusaetzliche Formularfelder fuer "Formular aus Vorlage erstellen" (Form-Builder). */
  formFields: IndustryFormFieldTemplate[];
  /** Haeufige Fragen fuer die oeffentliche Business-Seite. */
  faq: IndustryFaqItem[];
  recommendations: IndustryRecommendation[];
  defaultRecommendation: string;
  /** Beispielprodukt/-struktur fuer eine erste Angebotszeile im Angebotsgenerator. */
  quoteSuggestion: { title: string; price: number; lineItems: QuoteLineItem[] };
}

export const INDUSTRIES: Record<IndustryKey, IndustryDefinition> = {
  autopflege: {
    key: "autopflege",
    label: "Autopflege",
    tagline: "Dein Auto, glänzend wie neu.",
    description:
      "Professionelle Fahrzeugaufbereitung – von der Schnellwäsche bis zur Keramikversiegelung, transparent und termingerecht.",
    exampleServices: [
      "Innenreinigung",
      "Außenwäsche",
      "Premium-Aufbereitung",
      "Politur",
      "Keramikversiegelung",
    ],
    services: [
      { name: "Innenreinigung", description: "Saugen, Polster- und Kunststoffpflege, Fenster innen.", price: 59, duration_minutes: 60 },
      { name: "Außenwäsche", description: "Handwäsche, Felgenreinigung, Trocknung von Hand.", price: 35, duration_minutes: 30 },
      { name: "Premium-Aufbereitung", description: "Innen- und Außenreinigung inklusive Politur.", price: 249, duration_minutes: 180 },
      { name: "Politur", description: "Lackaufbereitung zur Entfernung von Kratzern und Mattierungen.", price: 120, duration_minutes: 90 },
      { name: "Keramikversiegelung", description: "Langfristiger Lackschutz mit Keramikversiegelung.", price: 399, duration_minutes: 240 },
    ],
    formFields: [
      {
        field_type: "select",
        label: "Fahrzeugtyp",
        required: true,
        options: ["Kleinwagen", "Kombi / Limousine", "SUV / Van", "Transporter"],
      },
      { field_type: "date", label: "Wunschtermin", required: false },
      {
        field_type: "textarea",
        label: "Zustand des Fahrzeugs",
        description: "Besonderheiten, Flecken, Gerüche o. Ä.",
        required: false,
      },
      { field_type: "file", label: "Fotos vom Fahrzeug", required: false },
    ],
    faq: [
      {
        q: "Muss ich mein Auto vorbeibringen?",
        a: "Für die meisten Leistungen ja – bei größeren Aufträgen bieten wir nach Absprache auch einen Hol- und Bringservice an.",
      },
      {
        q: "Wie lange dauert eine Aufbereitung?",
        a: "Je nach Umfang zwischen 30 Minuten (Außenwäsche) und einem halben Tag (Keramikversiegelung). Die genaue Dauer nennen wir dir mit dem Angebot.",
      },
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
    quoteSuggestion: {
      title: "Premium-Aufbereitung",
      price: 249,
      lineItems: [
        { description: "Premium-Aufbereitung (innen & außen)", quantity: 1, unit_price: 249 },
        { description: "Keramikversiegelung", quantity: 1, unit_price: 399 },
      ],
    },
  },
  reinigung: {
    key: "reinigung",
    label: "Reinigung",
    tagline: "Sauber. Zuverlässig. Termingerecht.",
    description:
      "Reinigungsservice für Privat und Gewerbe – von der Einmalreinigung bis zum festen Reinigungsplan.",
    exampleServices: [
      "Büroreinigung",
      "Praxisreinigung",
      "Umzugs- / Endreinigung",
      "Fensterreinigung",
      "Grundreinigung",
    ],
    services: [
      { name: "Büroreinigung", description: "Regelmäßige Unterhaltsreinigung für Büroräume.", price: 120, duration_minutes: 90 },
      { name: "Praxisreinigung", description: "Hygienische Reinigung für Arzt- und Physiopraxen.", price: 140, duration_minutes: 90 },
      { name: "Umzugs- / Endreinigung", description: "Übergabefertige Reinigung inklusive Fenster.", price: 220, duration_minutes: 240 },
      { name: "Fensterreinigung", description: "Fenster, Rahmen und Fensterbänke.", price: 80, duration_minutes: 60 },
      { name: "Grundreinigung", description: "Gründliche Reinigung nach individuellem Plan.", price: 180, duration_minutes: 150 },
    ],
    formFields: [
      {
        field_type: "select",
        label: "Objektart",
        required: true,
        options: ["Wohnung", "Büro", "Praxis", "Sonstiges"],
      },
      { field_type: "number", label: "Fläche (m²)", required: false },
      { field_type: "date", label: "Wunschtermin", required: false },
      { field_type: "checkbox", label: "Schlüsselübergabe gewünscht", required: false },
    ],
    faq: [
      {
        q: "Bringt ihr euer eigenes Reinigungsmaterial mit?",
        a: "Ja, Reinigungsmittel und Ausrüstung bringen wir standardmäßig mit. Auf Wunsch nutzen wir auch deine eigenen Mittel.",
      },
      {
        q: "Ist eine Reinigung auch kurzfristig möglich?",
        a: "Bei freien Kapazitäten ja – schreib uns einfach dein Wunschdatum in die Anfrage, wir melden uns schnellstmöglich zurück.",
      },
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
    quoteSuggestion: {
      title: "Grundreinigung",
      price: 180,
      lineItems: [
        { description: "Grundreinigung", quantity: 1, unit_price: 180 },
        { description: "Fensterreinigung", quantity: 1, unit_price: 80 },
      ],
    },
  },
  gartenservice: {
    key: "gartenservice",
    label: "Gartenservice",
    tagline: "Dein Garten in besten Händen.",
    description:
      "Gartenpflege und -gestaltung – von der Rasenpflege bis zum Baumschnitt, zuverlässig und termingerecht.",
    exampleServices: [
      "Rasenpflege",
      "Heckenschnitt",
      "Baumschnitt",
      "Gartenneuanlage",
      "Laubentfernung",
    ],
    services: [
      { name: "Rasenpflege", description: "Mähen, Vertikutieren und Düngen.", price: 60, duration_minutes: 60 },
      { name: "Heckenschnitt", description: "Fachgerechter Schnitt inklusive Abtransport des Grünschnitts.", price: 90, duration_minutes: 90 },
      { name: "Baumschnitt", description: "Pflege- und Formschnitt je nach Baumzustand.", price: 150, duration_minutes: 120 },
      { name: "Gartenneuanlage", description: "Planung und Umsetzung neuer Gartenbereiche.", price: null, duration_minutes: null },
      { name: "Laubentfernung", description: "Laub und Grünschnitt entfernen und entsorgen.", price: 70, duration_minutes: 60 },
    ],
    formFields: [
      { field_type: "number", label: "Grundstücksgröße (m²)", required: false },
      {
        field_type: "multiselect",
        label: "Art der Arbeiten",
        required: true,
        options: ["Rasenpflege", "Heckenschnitt", "Baumschnitt", "Neuanlage", "Sonstiges"],
      },
      { field_type: "date", label: "Wunschtermin", required: false },
      { field_type: "textarea", label: "Beschreibung", required: false },
    ],
    faq: [
      {
        q: "Entsorgt ihr den Grünschnitt?",
        a: "Ja, der Abtransport und die fachgerechte Entsorgung sind bei allen Schnittarbeiten bereits inklusive.",
      },
      {
        q: "Bietet ihr auch regelmäßige Pflege im Abo an?",
        a: "Ja, gerne stellen wir dir nach dem ersten Termin ein individuelles Pflegepaket mit festen Terminen zusammen.",
      },
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
    quoteSuggestion: {
      title: "Gartenpflege",
      price: 150,
      lineItems: [
        { description: "Heckenschnitt", quantity: 1, unit_price: 90 },
        { description: "Rasenpflege", quantity: 1, unit_price: 60 },
      ],
    },
  },
  fotografie: {
    key: "fotografie",
    label: "Fotografie",
    tagline: "Momente, die bleiben.",
    description:
      "Fotografie für Portraits, Hochzeiten und Business – professionell begleitet vom ersten Gespräch bis zu den fertigen Bildern.",
    exampleServices: [
      "Portraitfotografie",
      "Hochzeitsfotografie",
      "Business-/Bewerbungsfotos",
      "Event-Fotografie",
      "Produktfotografie",
    ],
    services: [
      { name: "Portraitfotografie", description: "Individuelles Shooting inklusive bearbeiteter Bilder.", price: 149, duration_minutes: 90 },
      { name: "Hochzeitsfotografie", description: "Ganztägige Begleitung von Vorbereitung bis Feier.", price: 1200, duration_minutes: 480 },
      { name: "Business-/Bewerbungsfotos", description: "Kurzes Shooting mit mehreren bearbeiteten Bildern.", price: 99, duration_minutes: 45 },
      { name: "Event-Fotografie", description: "Begleitung deiner Veranstaltung nach Stunden.", price: 350, duration_minutes: 180 },
      { name: "Produktfotografie", description: "Professionelle Produktbilder für Shop und Katalog.", price: 199, duration_minutes: 120 },
    ],
    formFields: [
      {
        field_type: "select",
        label: "Art des Shootings",
        required: true,
        options: ["Portrait", "Hochzeit", "Business", "Event", "Produkt"],
      },
      { field_type: "date", label: "Wunschtermin", required: false },
      { field_type: "number", label: "Anzahl Personen", required: false },
      { field_type: "textarea", label: "Wünsche / Ideen", required: false },
    ],
    faq: [
      {
        q: "Wie viele Bilder bekomme ich?",
        a: "Die Anzahl hängt vom gebuchten Paket ab – im Angebot nennen wir dir genau, wie viele bearbeitete Bilder enthalten sind.",
      },
      {
        q: "Wie schnell erhalte ich die bearbeiteten Fotos?",
        a: "In der Regel innerhalb von 1-2 Wochen nach dem Shooting, bei Hochzeiten etwas länger.",
      },
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
    quoteSuggestion: {
      title: "Fotoshooting",
      price: 249,
      lineItems: [
        { description: "Fotoshooting (2 Stunden)", quantity: 1, unit_price: 249 },
        { description: "Bildbearbeitung (10 Bilder)", quantity: 1, unit_price: 80 },
      ],
    },
  },
  handwerk: {
    key: "handwerk",
    label: "Handwerk",
    tagline: "Handwerk, auf das Verlass ist.",
    description:
      "Handwerksleistungen für Zuhause und Gewerbe – von der kleinen Reparatur bis zur kompletten Sanierung.",
    exampleServices: [
      "Renovierung",
      "Reparaturarbeiten",
      "Bad-/Küchensanierung",
      "Malerarbeiten",
      "Kleine Umbauten",
    ],
    services: [
      { name: "Renovierung", description: "Renovierungsarbeiten nach individuellem Umfang.", price: null, duration_minutes: null },
      { name: "Reparaturarbeiten", description: "Kurzfristige Reparaturen vor Ort.", price: 65, duration_minutes: 60 },
      { name: "Bad-/Küchensanierung", description: "Komplettsanierung inklusive Planung.", price: null, duration_minutes: null },
      { name: "Malerarbeiten", description: "Streicharbeiten inklusive Untergrundvorbereitung.", price: 350, duration_minutes: 480 },
      { name: "Kleine Umbauten", description: "Kleinere Umbauarbeiten nach Aufwand.", price: 65, duration_minutes: 60 },
    ],
    formFields: [
      {
        field_type: "select",
        label: "Art der Arbeiten",
        required: true,
        options: ["Renovierung", "Reparatur", "Sanierung", "Malerarbeiten", "Sonstiges"],
      },
      { field_type: "textarea", label: "Beschreibung des Vorhabens", required: true },
      { field_type: "file", label: "Fotos", required: false },
      { field_type: "date", label: "Wunschtermin", required: false },
    ],
    faq: [
      {
        q: "Kommt ihr auch kurzfristig für Reparaturen?",
        a: "Bei freien Kapazitäten ja – schreib uns kurz dein Anliegen, wir melden uns schnellstmöglich mit einem Termin zurück.",
      },
      {
        q: "Erstellt ihr einen kostenlosen Kostenvoranschlag vor Ort?",
        a: "Bei größeren Vorhaben wie Sanierungen ja. Für kleinere Reparaturen erhältst du dein Angebot meist bereits nach der Anfrage.",
      },
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
    quoteSuggestion: {
      title: "Handwerkerleistung",
      price: 65,
      lineItems: [
        { description: "Besichtigung vor Ort", quantity: 1, unit_price: 0 },
        { description: "Malerarbeiten (Material & Arbeit)", quantity: 1, unit_price: 350 },
      ],
    },
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
