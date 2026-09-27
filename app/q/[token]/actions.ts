"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";
import { getEmailProvider } from "@/lib/email";
import { logger } from "@/lib/logger";
import type { PublicQuotePayload } from "@/types/database";

export type PublicQuoteActionState = { error?: string; message?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte lade die Seite neu.";

// Fehlermeldungen, die die SECURITY DEFINER RPC `record_public_quote_event`
// bewusst per `raise exception` wirft (siehe supabase/schema.sql) –
// hier in verstaendliche, deutsche Kundentexte uebersetzt.
const RPC_ERROR_MESSAGES: Record<string, string> = {
  expired: "Dieses Angebot ist leider abgelaufen und kann nicht mehr angenommen werden.",
  invalid_transition: "Dieses Angebot wurde bereits beantwortet.",
  not_found: "Dieses Angebot wurde nicht gefunden.",
};

function messageForRpcError(error: { message?: string } | null): string {
  if (!error?.message) return GENERIC_ERROR;
  for (const [key, message] of Object.entries(RPC_ERROR_MESSAGES)) {
    if (error.message.includes(key)) return message;
  }
  return GENERIC_ERROR;
}

async function recordEvent(
  token: string,
  event: "accepted" | "declined"
): Promise<PublicQuoteActionState> {
  if (!token) return { error: "Ungültiger Link." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_public_quote_event", {
    p_public_token: token,
    p_event: event,
  });

  if (error) {
    logger.error("publicQuote.recordEvent", "RPC fehlgeschlagen", error, { event });
    return { error: messageForRpcError(error) };
  }

  if (event === "accepted") {
    await track("quote_accepted");
    await track("lead_won");

    // Best effort: die Annahme ist bereits gespeichert (siehe RPC oben),
    // ein fehlgeschlagener E-Mail-Versand darf das nicht beeinflussen.
    const { data: payload } = await supabase.rpc("get_public_quote", {
      p_public_token: token,
    });
    const quote = payload as PublicQuotePayload | null;
    if (quote?.business_email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
      const emailProvider = getEmailProvider();
      const emailResult = await emailProvider.sendQuoteAcceptedEmail({
        to: quote.business_email,
        businessName: quote.business_name,
        customerName: quote.customer_name,
        quoteTitle: quote.title,
        leadUrl: `${siteUrl}/quotes/${quote.id}`,
      });
      if (!emailResult.ok) {
        logger.warn("publicQuote.recordEvent", "Annahme-E-Mail konnte nicht gesendet werden");
      }
    }
  }

  revalidatePath(`/q/${token}`);
  return {
    message:
      event === "accepted"
        ? "Danke! Das Angebot wurde angenommen."
        : "Das Angebot wurde abgelehnt.",
  };
}

export async function acceptQuote(
  _prev: PublicQuoteActionState,
  formData: FormData
): Promise<PublicQuoteActionState> {
  return recordEvent(String(formData.get("token") ?? ""), "accepted");
}

export async function declineQuote(
  _prev: PublicQuoteActionState,
  formData: FormData
): Promise<PublicQuoteActionState> {
  return recordEvent(String(formData.get("token") ?? ""), "declined");
}

// Fehlermeldungen, die die SECURITY DEFINER RPC `book_appointment` bewusst
// per `raise exception` wirft (siehe supabase/schema.sql).
const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  not_found: "Dieses Angebot wurde nicht gefunden.",
  quote_not_accepted: "Bitte nimm zuerst das Angebot an, bevor du einen Termin buchst.",
  feature_not_available: "Die Terminbuchung ist für dieses Unternehmen aktuell nicht verfügbar.",
  slot_in_past: "Dieser Termin liegt in der Vergangenheit. Bitte wähle einen anderen Slot.",
  already_booked: "Für diese Anfrage wurde bereits ein Termin gebucht.",
  slot_unavailable: "Dieser Termin ist leider inzwischen vergeben. Bitte wähle einen anderen Slot.",
  outside_business_hours: "Dieser Termin liegt außerhalb der Öffnungszeiten. Bitte wähle einen anderen Slot.",
};

function messageForBookingError(error: { message?: string } | null): string {
  if (!error?.message) return GENERIC_ERROR;
  for (const [key, message] of Object.entries(BOOKING_ERROR_MESSAGES)) {
    if (error.message.includes(key)) return message;
  }
  return GENERIC_ERROR;
}

export async function bookAppointment(
  _prev: PublicQuoteActionState,
  formData: FormData
): Promise<PublicQuoteActionState> {
  const token = String(formData.get("token") ?? "");
  const startsAt = String(formData.get("starts_at") ?? "");
  if (!token || !startsAt) {
    return { error: "Bitte wähle einen Termin aus." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("book_appointment", {
    p_public_token: token,
    p_starts_at: startsAt,
  });

  if (error) {
    logger.error("publicQuote.bookAppointment", "RPC fehlgeschlagen", error);
    return { error: messageForBookingError(error) };
  }

  await track("appointment_booked");

  revalidatePath(`/q/${token}`);
  return { message: "Dein Termin wurde gebucht." };
}
