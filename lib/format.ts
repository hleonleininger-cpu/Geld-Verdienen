import type { LeadStatus } from "@/types/database";

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
  in_progress: "In Bearbeitung",
  quote_sent: "Angebot gesendet",
  won: "Gewonnen",
  lost: "Verloren",
};

export const STATUS_ORDER: LeadStatus[] = [
  "new",
  "in_progress",
  "quote_sent",
  "won",
  "lost",
];

export const STATUS_BADGE_CLASSES: Record<LeadStatus, string> = {
  new: "bg-brand-100 text-brand-700",
  in_progress: "bg-amber-100 text-amber-700",
  quote_sent: "bg-sky-100 text-sky-700",
  won: "bg-brand-600 text-white",
  lost: "bg-ink-100 text-ink-500",
};

export function parseBudget(budget: string | null | undefined): number {
  if (!budget) return 0;
  const numbers = budget.match(/\d+([.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return 0;
  const parsed = numbers.map((n) => parseFloat(n.replace(",", ".")));
  return parsed.reduce((a, b) => a + b, 0) / parsed.length;
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
