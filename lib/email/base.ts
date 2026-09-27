import {
  appointmentReminderTemplate,
  leadNotificationTemplate,
  quoteAcceptedEmailTemplate,
  quoteEmailTemplate,
} from "@/lib/email/templates";
import type {
  AppointmentReminderParams,
  EmailMessage,
  EmailProvider,
  EmailResult,
  LeadNotificationParams,
  QuoteAcceptedEmailParams,
  QuoteEmailParams,
} from "@/lib/email/types";

/**
 * Implementiert die vier semantischen Versandmethoden einmalig anhand der
 * einzigen abstrakten Primitive `sendEmail()` – ein konkreter Provider
 * (Console, Resend, ...) muss nur `sendEmail()` + `isConfigured()`
 * implementieren, nicht jede Vorlage erneut. Vermeidet Duplikation
 * zwischen Providern ("Keep provider-specific implementation isolated").
 */
export abstract class BaseEmailProvider implements EmailProvider {
  abstract readonly name: string;
  abstract isConfigured(): boolean;
  abstract sendEmail(message: EmailMessage): Promise<EmailResult>;

  async sendLeadNotification(params: LeadNotificationParams): Promise<EmailResult> {
    return this.sendEmail(leadNotificationTemplate(params));
  }

  async sendQuoteEmail(params: QuoteEmailParams): Promise<EmailResult> {
    return this.sendEmail(quoteEmailTemplate(params));
  }

  async sendQuoteAcceptedEmail(params: QuoteAcceptedEmailParams): Promise<EmailResult> {
    return this.sendEmail(quoteAcceptedEmailTemplate(params));
  }

  async sendAppointmentReminderEmail(params: AppointmentReminderParams): Promise<EmailResult> {
    return this.sendEmail(appointmentReminderTemplate(params));
  }
}
