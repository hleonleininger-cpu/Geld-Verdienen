export type MessageChannel = "email" | "sms" | "whatsapp";

export interface MessageTemplate {
  subject?: string;
  body: string;
}

export interface SendMessageParams {
  to: string;
  channel: MessageChannel;
  template: MessageTemplate;
}

export interface SendMessageResult {
  ok: boolean;
  error?: string;
}

/**
 * Provider-Abstraktion fuer Kunden-Kommunikation (Phase 6). Der Rest der
 * App spricht ausschliesslich mit diesem Interface – welcher Kanal
 * tatsaechlich sendet (oder eben nur zum manuellen Kopieren vorbereitet),
 * ist eine reine Implementierungsdetail-Entscheidung des aktiven Providers.
 * Ein spaeterer Wechsel auf einen echten Versanddienst (z. B. Postmark fuer
 * E-Mail, Twilio fuer SMS, die WhatsApp Business API) aendert nur
 * `lib/communication/index.ts`, nie die Aufrufer.
 */
export interface MessageProvider {
  readonly name: string;
  /** Ob dieser Kanal fuer diesen Provider ueberhaupt sendbar ist. */
  canSend(channel: MessageChannel): boolean;
  send(params: SendMessageParams): Promise<SendMessageResult>;
}
