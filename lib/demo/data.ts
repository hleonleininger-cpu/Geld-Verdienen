import { INDUSTRIES } from "@/lib/industries";
import type { LeadStatus, QuoteLineItem, QuoteStatus } from "@/types/database";

/**
 * Statische Demo-Daten fuer die oeffentliche `/demo`-Seite (Section 10).
 *
 * Bewusst KEINE Datenbank-Zeilen: die Seite ist rein clientseitig gerendert
 * und schreibt niemals in `businesses`/`leads`/`quotes`. Damit ist "niemals
 * Demo-Daten mit echten Mandantendaten vermischen" strukturell garantiert –
 * es gibt schlicht keinen Demo-Tenant in der Datenbank, den man vermischen
 * koennte. Alle "Aktionen" auf der Demo-Seite (Anfrage absenden, Slot
 * waehlen) veraendern nur lokalen React-State und verschwinden beim Neuladen.
 *
 * Die Branche ist bewusst identisch mit dem "Erstes Produktpaket"
 * (Autopflege, siehe lib/industries.ts) – dieselben Leistungen/FAQ/
 * Formularfelder werden hier nur wiederverwendet, nicht dupliziert.
 */

const industry = INDUSTRIES.autopflege;

export const DEMO_BUSINESS = {
  businessName: "Shine Garage",
  slug: "shine-garage",
  tagline: industry.tagline,
  description: industry.description,
  industryLabel: industry.label,
  phone: "+49 89 1234567",
  email: "kontakt@shine-garage-demo.de",
  accentColor: "#1c9166",
};

export const DEMO_SERVICES = industry.services;
export const DEMO_FAQ = industry.faq;
export const DEMO_FORM_FIELDS = industry.formFields;

export type DemoLead = {
  id: string;
  customerName: string;
  service: string;
  status: LeadStatus;
  createdAt: string;
};

export const DEMO_LEADS: DemoLead[] = [
  { id: "d1", customerName: "Max Mustermann", service: "Premium-Aufbereitung", status: "won", createdAt: "vor 6 Tagen" },
  { id: "d2", customerName: "Julia Weber", service: "Keramikversiegelung", status: "quote_sent", createdAt: "vor 2 Tagen" },
  { id: "d3", customerName: "Tom Fischer", service: "Innenreinigung", status: "contacted", createdAt: "vor 1 Tag" },
  { id: "d4", customerName: "Anna Keller", service: "Außenwäsche", status: "new", createdAt: "vor 3 Stunden" },
];

export const DEMO_QUOTE: {
  title: string;
  lineItems: QuoteLineItem[];
  status: QuoteStatus;
  validUntil: string;
} = {
  title: industry.quoteSuggestion.title,
  lineItems: industry.quoteSuggestion.lineItems,
  status: "accepted",
  validUntil: "in 3 Wochen",
};

export const DEMO_APPOINTMENT = {
  weekday: "Donnerstag",
  time: "10:00",
  status: "confirmed" as const,
};

export const DEMO_AVAILABLE_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:30"];

export const DEMO_FUNNEL = {
  newLeads: 4,
  openQuotes: 3,
  upcomingAppointments: 2,
  wonJobs: 7,
  estimatedRevenueEUR: 2140,
};
