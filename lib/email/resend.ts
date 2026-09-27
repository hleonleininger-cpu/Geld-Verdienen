import { BaseEmailProvider } from "@/lib/email/base";
import { logger } from "@/lib/logger";
import { fetchWithTimeout } from "@/lib/fetchWithTimeout";
import type { EmailMessage, EmailResult } from "@/lib/email/types";

const RESEND_API = "https://api.resend.com/emails";

/**
 * Generischer transaktionaler E-Mail-Versand ueber HTTP (Resend-API).
 *
 * Bewusst KEIN SMTP: Cloudflare Workers hat keine zuverlaessige Unterstuetzung
 * fuer rohe SMTP-Sockets (Auth-Handshake, TLS-Upgrade) in der Workers-
 * Runtime – ein HTTP-basierter Transactional-E-Mail-Dienst ist der
 * praxistaugliche "generische SMTP-Ersatz" fuer diese Plattform, exakt
 * das gleiche Muster wie `lib/billing/stripe.ts` (fetch statt SDK, damit
 * es ohne Node-Kompatibilitaetsschicht bündelt). Ein Wechsel auf einen
 * anderen HTTP-Anbieter (Postmark, SendGrid, ...) aendert nur diese Datei.
 */
export class ResendEmailProvider extends BaseEmailProvider {
  readonly name = "resend";

  private get apiKey(): string | undefined {
    return process.env.RESEND_API_KEY;
  }

  private get fromAddress(): string | undefined {
    return process.env.EMAIL_FROM_ADDRESS;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.fromAddress);
  }

  async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!this.isConfigured()) {
      return { ok: false, error: "E-Mail-Versand ist nicht konfiguriert." };
    }

    try {
      const response = await fetchWithTimeout(RESEND_API, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: this.fromAddress,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        logger.error("email.resend", "Versand fehlgeschlagen", body, {
          status: response.status,
        });
        return { ok: false, error: "E-Mail konnte nicht gesendet werden." };
      }

      return { ok: true };
    } catch (error) {
      // Timeout/Netzwerkfehler duerfen den aufrufenden Flow (Lead-
      // Erstellung, Angebotsversand, ...) NIEMALS unterbrechen – siehe
      // docs/PRODUCT_FLOWS.md, "Fehlertoleranz".
      logger.error("email.resend", "Versand fehlgeschlagen (Netzwerk/Timeout)", error);
      return { ok: false, error: "E-Mail konnte nicht gesendet werden." };
    }
  }
}
