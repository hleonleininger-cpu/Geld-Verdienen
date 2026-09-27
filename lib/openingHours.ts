import type { OpeningHoursEntry } from "@/types/database";

export const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const DAY_LABELS: Record<string, string> = {
  mon: "Montag",
  tue: "Dienstag",
  wed: "Mittwoch",
  thu: "Donnerstag",
  fri: "Freitag",
  sat: "Samstag",
  sun: "Sonntag",
};

export const DEFAULT_OPENING_HOURS: OpeningHoursEntry[] = [
  { day: "mon", open: "09:00", close: "18:00", closed: false },
  { day: "tue", open: "09:00", close: "18:00", closed: false },
  { day: "wed", open: "09:00", close: "18:00", closed: false },
  { day: "thu", open: "09:00", close: "18:00", closed: false },
  { day: "fri", open: "09:00", close: "18:00", closed: false },
  { day: "sat", open: "10:00", close: "14:00", closed: true },
  { day: "sun", open: "10:00", close: "14:00", closed: true },
];
