import { ConsoleEmailProvider } from "@/lib/email/console";
import { ResendEmailProvider } from "@/lib/email/resend";
import type { EmailProvider } from "@/lib/email/types";

export type {
  EmailProvider,
  EmailMessage,
  EmailResult,
  LeadNotificationParams,
  QuoteEmailParams,
  QuoteAcceptedEmailParams,
  AppointmentReminderParams,
} from "@/lib/email/types";

/**
 * Resend wird nur zurückgegeben, wenn tatsächlich Zugangsdaten
 * konfiguriert sind – sonst greift der immer funktionierende
 * `ConsoleEmailProvider` (loggt statt zu senden). So bricht lokale
 * Entwicklung/eine Umgebung ohne E-Mail-Konfiguration nie am
 * E-Mail-Versand.
 */
export function getEmailProvider(): EmailProvider {
  const resend = new ResendEmailProvider();
  if (resend.isConfigured()) {
    return resend;
  }
  return new ConsoleEmailProvider();
}
