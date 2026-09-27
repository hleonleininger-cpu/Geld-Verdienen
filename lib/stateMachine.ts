import type { AppointmentStatus, LeadStatus, QuoteStatus } from "@/types/database";

/**
 * Explizite State Machines fuer die drei Kern-Entitaeten des Funnels
 * (Lead/Quote/Appointment). Zentralisiert an einem Ort statt verstreuter
 * `.eq("status", ...)`/`.in("status", [...])`-Vergleiche, damit eine
 * ungueltige Transition (z. B. ein bereits gewonnener Lead zurueck auf
 * "neu") an einer einzigen Stelle verhindert wird und testbar ist.
 *
 * Bewusst NUR Transition-Regeln, keine Datenbankzugriffe – reine
 * Funktionen, die von Server Actions und RPCs (bzw. deren TS-Pendants)
 * aufgerufen werden.
 */

const LEAD_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  new: ["contacted", "qualified", "quote_sent", "lost"],
  contacted: ["qualified", "quote_sent", "negotiating", "lost"],
  qualified: ["quote_sent", "negotiating", "lost"],
  quote_sent: ["negotiating", "won", "lost"],
  negotiating: ["quote_sent", "won", "lost"],
  won: [],
  lost: ["new"],
};

const QUOTE_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  draft: ["sent"],
  sent: ["viewed", "accepted", "declined", "expired"],
  viewed: ["accepted", "declined", "expired"],
  accepted: [],
  declined: [],
  expired: [],
};

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

function canTransition<T extends string>(
  table: Record<T, T[]>,
  from: T,
  to: T
): boolean {
  if (from === to) return true;
  return table[from]?.includes(to) ?? false;
}

export function canTransitionLeadStatus(from: LeadStatus, to: LeadStatus): boolean {
  return canTransition(LEAD_TRANSITIONS, from, to);
}

export function canTransitionQuoteStatus(from: QuoteStatus, to: QuoteStatus): boolean {
  return canTransition(QUOTE_TRANSITIONS, from, to);
}

export function canTransitionAppointmentStatus(
  from: AppointmentStatus,
  to: AppointmentStatus
): boolean {
  return canTransition(APPOINTMENT_TRANSITIONS, from, to);
}

/**
 * Ob ein Lead als "aktiv im Funnel" gilt (fuer Dashboard-Kennzahlen /
 * Funnel-Widget) – ausgeschlossen sind die beiden Endzustaende.
 */
export function isLeadOpen(status: LeadStatus): boolean {
  return status !== "won" && status !== "lost";
}

export function isQuoteFinal(status: QuoteStatus): boolean {
  return status === "accepted" || status === "declined" || status === "expired";
}

export function isAppointmentFinal(status: AppointmentStatus): boolean {
  return status === "completed" || status === "cancelled" || status === "no_show";
}

export const LEAD_STATUS_ORDER: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiating",
  "won",
  "lost",
];

export const QUOTE_STATUS_ORDER: QuoteStatus[] = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
];

export const APPOINTMENT_STATUS_ORDER: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
];
