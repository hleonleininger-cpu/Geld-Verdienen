import type {
  LeadStatus,
  LeadPriority,
  QuoteStatus,
  RequestFieldType,
  AppointmentStatus,
} from "@/types/database";

export function formatDateDe(value: string | null | undefined): string {
  if (!value) return "flexibel";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "flexibel";
  return date.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTimeDe(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTimeDe(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

export function formatRelativeDe(value: string | null | undefined): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  const diffMs = date.getTime() - Date.now();
  const diffMin = Math.round(diffMs / 60000);
  const abs = Math.abs(diffMin);

  const units: [number, string][] = [
    [60, "Minute"],
    [24, "Stunde"],
    [30, "Tag"],
    [12, "Monat"],
  ];

  let value_ = abs;
  let unit = "Minute";
  let divisor = 1;
  for (const [amount, name] of units) {
    if (value_ < amount) {
      unit = name;
      break;
    }
    value_ = Math.round(value_ / amount);
    divisor *= amount;
    unit = name;
  }
  void divisor;

  const plural = value_ === 1 ? unit : unit + (unit === "Monat" ? "e" : "n");
  return diffMin >= 0 ? `in ${value_} ${plural}` : `vor ${value_} ${plural}`;
}

export function formatCurrencyEUR(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

export const STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Neu",
  contacted: "Kontaktiert",
  qualified: "Qualifiziert",
  quote_sent: "Angebot gesendet",
  negotiating: "In Verhandlung",
  won: "Gewonnen",
  lost: "Verloren",
};

export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiating",
  "won",
  "lost",
];

export const STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  new: "bg-brand-100 text-brand-700",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-violet-100 text-violet-700",
  quote_sent: "bg-sky-100 text-sky-700",
  negotiating: "bg-orange-100 text-orange-700",
  won: "bg-brand-600 text-white",
  lost: "bg-ink-100 text-ink-500",
};

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Entwurf",
  sent: "Gesendet",
  viewed: "Angesehen",
  accepted: "Angenommen",
  declined: "Abgelehnt",
  expired: "Abgelaufen",
};

export const QUOTE_STATUS_BADGE_CLASSES: Record<QuoteStatus, string> = {
  draft: "bg-ink-100 text-ink-500",
  sent: "bg-sky-100 text-sky-700",
  viewed: "bg-amber-100 text-amber-700",
  accepted: "bg-brand-600 text-white",
  declined: "bg-red-100 text-red-700",
  expired: "bg-ink-100 text-ink-400",
};

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Geplant",
  confirmed: "Bestätigt",
  completed: "Abgeschlossen",
  cancelled: "Storniert",
  no_show: "Nicht erschienen",
};

export const APPOINTMENT_STATUS_BADGE_CLASSES: Record<AppointmentStatus, string> = {
  scheduled: "bg-sky-100 text-sky-700",
  confirmed: "bg-brand-600 text-white",
  completed: "bg-ink-100 text-ink-500",
  cancelled: "bg-red-100 text-red-700",
  no_show: "bg-amber-100 text-amber-700",
};

export const PRIORITY_LABELS: Record<LeadPriority, string> = {
  low: "Niedrig",
  medium: "Mittel",
  high: "Hoch",
};

export const PRIORITY_BADGE_CLASSES: Record<LeadPriority, string> = {
  low: "bg-ink-100 text-ink-500",
  medium: "bg-sky-100 text-sky-700",
  high: "bg-red-100 text-red-700",
};

export const FIELD_TYPE_LABELS: Record<RequestFieldType, string> = {
  text: "Text (einzeilig)",
  textarea: "Text (mehrzeilig)",
  email: "E-Mail",
  phone: "Telefon",
  number: "Zahl",
  date: "Datum",
  select: "Auswahl (eine Option)",
  multiselect: "Auswahl (mehrere Optionen)",
  checkbox: "Checkbox (ja/nein)",
  file: "Datei-Upload",
};

export function parseBudget(budget: string | null | undefined): number {
  if (!budget) return 0;
  const numbers = budget.match(/\d+([.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return 0;
  const parsed = numbers.map((n) => parseFloat(n.replace(",", ".")));
  return parsed.reduce((a, b) => a + b, 0) / parsed.length;
}

/**
 * Liefert einen ISO-Zeitstempel `days` Tage in der Vergangenheit (oder
 * `null` fuer "kein Startdatum" = gesamter Zeitraum). Ausgelagert in eine
 * eigene Funktion, damit Server Components (z. B. /admin) den impuren
 * `Date.now()`-Aufruf nicht direkt in ihrem Funktionskörper stehen haben
 * (react-hooks/purity-Lint-Regel).
 */
export function daysAgoIso(days: number | null): string | null {
  if (days === null) return null;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
