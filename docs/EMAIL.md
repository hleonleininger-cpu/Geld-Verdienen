# E-Mail-Versand (Resend-Integration)

Diese Datei beschreibt die `EmailProvider`-Abstraktion und wie sie in
einem echten Projekt eingerichtet wird – analog zu
[`docs/BILLING.md`](./BILLING.md) für Stripe.

## Architektur: `EmailProvider`-Abstraktion

Der Rest der App spricht ausschließlich mit dem Interface `EmailProvider`
in [`lib/email/types.ts`](../lib/email/types.ts):

```ts
interface EmailProvider {
  isConfigured(): boolean;
  sendEmail(message): Promise<EmailResult>;
  sendLeadNotification(...): Promise<EmailResult>;
  sendQuoteEmail(...): Promise<EmailResult>;
  sendQuoteAcceptedEmail(...): Promise<EmailResult>;
  sendAppointmentReminderEmail(...): Promise<EmailResult>;
}
```

[`lib/email/base.ts`](../lib/email/base.ts)::`BaseEmailProvider` implementiert
alle semantischen Methoden (Lead-Benachrichtigung, Angebots-Mail, ...) einmal
über die HTML-Vorlagen in [`lib/email/templates.ts`](../lib/email/templates.ts)
und delegiert am Ende an eine einzige primitive `sendEmail()`-Methode –
ein neuer Provider muss nur diese eine Methode implementieren, nicht jede
Vorlage neu schreiben.

Zwei Implementierungen:

- **`ConsoleEmailProvider`** ([`lib/email/console.ts`](../lib/email/console.ts)):
  loggt die E-Mail nur (`logger.info`), versendet nichts. Immer
  "konfiguriert" (`isConfigured() === true`), damit sie als sicherer
  Dev-Fallback ohne jede Umgebungsvariable funktioniert.
- **`ResendEmailProvider`** ([`lib/email/resend.ts`](../lib/email/resend.ts)):
  spricht die Resend-REST-API per `fetch` an (kein SDK, Cloudflare-
  Workers-kompatibel, gleiches Muster wie `lib/billing/stripe.ts`), mit
  hartem Timeout über [`lib/fetchWithTimeout.ts`](../lib/fetchWithTimeout.ts).

[`lib/email/index.ts`](../lib/email/index.ts)::`getEmailProvider()` ist die
einzige Stelle, die entscheidet, welcher Provider aktiv ist: `Resend`, wenn
`RESEND_API_KEY` **und** `EMAIL_FROM_ADDRESS` gesetzt sind, sonst `Console`.

**Kein SMTP?** Cloudflare Workers hat keine zuverlässige Unterstützung für
rohe SMTP-Sockets (Auth-Handshake, TLS-Upgrade) in der Workers-Runtime. Ein
HTTP-basierter transaktionaler E-Mail-Dienst ist der praxistaugliche
"generische SMTP-Ersatz" für diese Plattform.

## Wo E-Mails ausgelöst werden

| Auslöser | Empfänger | Funktion |
| --- | --- | --- |
| Neuer Lead (Standard- oder eigenes Formular) | Business-Owner | `lib/leadIngestion.ts`::`ingestLead()` → `sendLeadNotification()` |
| Angebot versendet | Kunde (falls in `sendQuote()` verdrahtet) | `sendQuoteEmail()` |
| Angebot angenommen | Business-Owner | `app/q/[token]/actions.ts` → `sendQuoteAcceptedEmail()` |
| Termin-Erinnerung | Kunde | `sendAppointmentReminderEmail()` – Infrastruktur vorbereitet, kein produktiver Cron/Scheduler in dieser Phase |

Alle Aufrufe sind **best effort**: ein fehlgeschlagener Versand wird
geloggt (`logger.warn`/`logger.error`), aber die eigentliche Aktion (Lead
anlegen, Angebot annehmen, ...) ist zu diesem Zeitpunkt bereits
abgeschlossen und wird durch einen E-Mail-Fehler niemals rückgängig
gemacht oder blockiert.

## Environment-Variablen

Beide optional – ohne sie läuft `ConsoleEmailProvider` (nur Logging).

| Variable | Zweck |
| --- | --- |
| `RESEND_API_KEY` | API-Key aus dem Resend-Dashboard |
| `EMAIL_FROM_ADDRESS` | Absenderadresse, z. B. `AnfragePilot <no-reply@deine-domain.de>` (Domain muss in Resend verifiziert sein) |

## Nie vergessen

- Der Server vertraut **nie** dem Client für Empfänger-/Inhaltsdaten –
  E-Mail-Inhalte werden serverseitig aus frisch geladenen DB-Zeilen gebaut.
- Kundenseitige E-Mails (z. B. Angebots-Mail) enthalten **nie** interne
  Business-Daten (Notizen, andere Leads, ...) – nur die für den
  Empfänger bestimmten Felder.
