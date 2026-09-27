export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailResult {
  ok: boolean;
  error?: string;
}

export interface LeadNotificationParams {
  to: string;
  businessName: string;
  customerName: string;
  service: string;
  leadUrl: string;
}

export interface QuoteEmailParams {
  to: string;
  businessName: string;
  quoteTitle: string;
  totalFormatted: string;
  validUntilFormatted: string | null;
  quoteUrl: string;
}

export interface QuoteAcceptedEmailParams {
  to: string;
  businessName: string;
  customerName: string;
  quoteTitle: string;
  leadUrl: string;
}

export interface AppointmentReminderParams {
  to: string;
  businessName: string;
  scheduledAtFormatted: string;
  appointmentUrl?: string;
}

/**
 * Provider-Abstraktion fuer E-Mail-Versand (Conversion-Funnel-Phase).
 * Gleiches Muster wie `lib/billing/types.ts` (PaymentProvider) und
 * `lib/communication/types.ts` (MessageProvider): der Rest der App ruft
 * ausschliesslich dieses Interface auf, nie einen konkreten Anbieter
 * direkt. Die vier semantischen Methoden sind bewusst Teil des
 * Interfaces (nicht nur lose Hilfsfunktionen), bauen aber alle auf der
 * einzigen primitiven `sendEmail()` auf – ein neuer Provider muss nur
 * `sendEmail()`/`isConfigured()` implementieren (siehe `BaseEmailProvider`).
 */
export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendEmail(message: EmailMessage): Promise<EmailResult>;
  sendLeadNotification(params: LeadNotificationParams): Promise<EmailResult>;
  sendQuoteEmail(params: QuoteEmailParams): Promise<EmailResult>;
  sendQuoteAcceptedEmail(params: QuoteAcceptedEmailParams): Promise<EmailResult>;
  sendAppointmentReminderEmail(params: AppointmentReminderParams): Promise<EmailResult>;
}
