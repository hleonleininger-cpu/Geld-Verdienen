import type {
  AppointmentReminderParams,
  EmailMessage,
  LeadNotificationParams,
  QuoteAcceptedEmailParams,
  QuoteEmailParams,
} from "@/lib/email/types";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapHtml(bodyHtml: string): string {
  return `<!doctype html>
<html lang="de">
  <body style="font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1c1c1c; max-width: 480px; margin: 0 auto; padding: 24px 16px;">
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #9a9a9a;">Gesendet über AnfragePilot.</p>
  </body>
</html>`;
}

/** An den Business-Owner: neue Anfrage eingegangen. */
export function leadNotificationTemplate(params: LeadNotificationParams): EmailMessage {
  const subject = `Neue Anfrage von ${params.customerName}`;
  const html = wrapHtml(`
    <h1 style="font-size: 20px;">Neue Anfrage 🎉</h1>
    <p><strong>${escapeHtml(params.customerName)}</strong> hat über ${escapeHtml(params.businessName)}
    eine Anfrage zu "${escapeHtml(params.service)}" gestellt.</p>
    <p><a href="${params.leadUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Anfrage ansehen</a></p>
  `);
  const text = `Neue Anfrage von ${params.customerName} (${params.service}). Ansehen: ${params.leadUrl}`;
  return { to: params.to, subject, html, text };
}

/** An den Kunden: Angebot wurde versendet. Bewusst OHNE interne Details
 * (keine internen Notizen, keine Lead-internen Felder) – nur was der
 * Kunde ohnehin auf der öffentlichen Angebotsseite sieht. */
export function quoteEmailTemplate(params: QuoteEmailParams): EmailMessage {
  const subject = `Ihr Angebot von ${params.businessName}`;
  const expiryLine = params.validUntilFormatted
    ? `<p>Gültig bis <strong>${escapeHtml(params.validUntilFormatted)}</strong>.</p>`
    : "";
  const html = wrapHtml(`
    <h1 style="font-size: 20px;">Ihr Angebot ist da</h1>
    <p><strong>${escapeHtml(params.businessName)}</strong> hat Ihnen ein Angebot erstellt:</p>
    <p style="font-size: 18px; font-weight: 600;">${escapeHtml(params.quoteTitle)}</p>
    <p style="font-size: 24px; font-weight: 700;">${escapeHtml(params.totalFormatted)}</p>
    ${expiryLine}
    <p><a href="${params.quoteUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Angebot ansehen &amp; annehmen</a></p>
  `);
  const text = `Ihr Angebot von ${params.businessName}: ${params.quoteTitle} – ${params.totalFormatted}.${
    params.validUntilFormatted ? ` Gültig bis ${params.validUntilFormatted}.` : ""
  } Ansehen: ${params.quoteUrl}`;
  return { to: params.to, subject, html, text };
}

/** An den Business-Owner: Kunde hat ein Angebot angenommen. */
export function quoteAcceptedEmailTemplate(params: QuoteAcceptedEmailParams): EmailMessage {
  const subject = `Angebot angenommen: ${params.quoteTitle}`;
  const html = wrapHtml(`
    <h1 style="font-size: 20px;">Angebot angenommen! 🎉</h1>
    <p><strong>${escapeHtml(params.customerName)}</strong> hat Ihr Angebot
    "${escapeHtml(params.quoteTitle)}" angenommen.</p>
    <p><a href="${params.leadUrl}" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none;">Details ansehen</a></p>
  `);
  const text = `${params.customerName} hat Ihr Angebot "${params.quoteTitle}" angenommen. Details: ${params.leadUrl}`;
  return { to: params.to, subject, html, text };
}

/** An den Kunden: Erinnerung an einen bevorstehenden Termin. */
export function appointmentReminderTemplate(params: AppointmentReminderParams): EmailMessage {
  const subject = `Erinnerung: Ihr Termin bei ${params.businessName}`;
  const link = params.appointmentUrl
    ? `<p><a href="${params.appointmentUrl}" style="color: #16a34a;">Termindetails ansehen</a></p>`
    : "";
  const html = wrapHtml(`
    <h1 style="font-size: 20px;">Terminerinnerung</h1>
    <p>Ihr Termin bei <strong>${escapeHtml(params.businessName)}</strong> ist am
    <strong>${escapeHtml(params.scheduledAtFormatted)}</strong>.</p>
    ${link}
  `);
  const text = `Erinnerung: Ihr Termin bei ${params.businessName} ist am ${params.scheduledAtFormatted}.`;
  return { to: params.to, subject, html, text };
}
