"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { track } from "@/lib/analytics";
import { logger } from "@/lib/logger";

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
