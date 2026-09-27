import type { MessageTemplate } from "@/lib/communication/types";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Vorgefertigte Nachricht zum Teilen eines Angebot-Links mit dem Kunden
 * (Phase 6). Wird ueber `CopyMessageButton` kopiert – der Versand selbst
 * (E-Mail/SMS/WhatsApp) passiert manuell durch den Betrieb, solange kein
 * echter `MessageProvider` konfiguriert ist.
 */
export function buildQuoteMessage(params: {
  customerName: string;
  businessName: string;
  quoteUrl: string;
  totalFormatted: string;
}): MessageTemplate {
  return {
    subject: `Ihr Angebot von ${params.businessName}`,
    body: `Hallo ${firstName(params.customerName)},

vielen Dank für Ihr Interesse! Ihr persönliches Angebot über ${params.totalFormatted} ist hier abrufbar:
${params.quoteUrl}

Dort können Sie es direkt online ansehen, annehmen oder ablehnen.

Beste Grüße
${params.businessName}`,
  };
}
