import { BaseEmailProvider } from "@/lib/email/base";
import { logger } from "@/lib/logger";
import type { EmailMessage, EmailResult } from "@/lib/email/types";

/**
 * Lokale Entwicklung / Umgebungen ohne konfigurierten Versanddienst:
 * loggt die E-Mail (Betreff + Empfänger, NICHT den vollen HTML-Body, um
 * Logs nicht unnötig aufzublähen) statt sie zu versenden. Schlägt
 * niemals fehl – ideal als sicherer Fallback, wenn kein echter Provider
 * konfiguriert ist.
 */
export class ConsoleEmailProvider extends BaseEmailProvider {
  readonly name = "console";

  isConfigured(): boolean {
    return true;
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    logger.info("email.console", `E-Mail an ${message.to}: "${message.subject}"`);
    return { ok: true };
  }
}
