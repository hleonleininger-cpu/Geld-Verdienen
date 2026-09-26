/**
 * Minimaler, produktionssicherer Server-Logger.
 *
 * - Läuft ausschließlich serverseitig (Server Actions, Route Handlers,
 *   Server Components) – niemals in einer "use client"-Datei importieren.
 * - Schreibt auf `console.*`, was unter Cloudflare Workers automatisch von
 *   "Workers Logs" erfasst wird (siehe `observability.enabled` in
 *   wrangler.jsonc) und lokal einfach im Terminal sichtbar ist.
 * - Nimmt bewusst KEIN generisches `context: Record<string, unknown>`
 *   entgegen, um nicht versehentlich Passwörter, Tokens, Service-Keys oder
 *   unnötige Kundendaten mitzuloggen. Wer strukturierten Kontext braucht,
 *   übergibt gezielt einzelne, unkritische Felder (z. B. IDs, niemals
 *   E-Mail-Adressen oder Freitext-Beschreibungen von Kunden).
 */

type SafeContext = Record<string, string | number | boolean | null | undefined>;

function format(scope: string, message: string, context?: SafeContext) {
  const base = `[${scope}] ${message}`;
  return context ? `${base} ${JSON.stringify(context)}` : base;
}

export const logger = {
  info(scope: string, message: string, context?: SafeContext) {
    console.log(format(scope, message, context));
  },
  warn(scope: string, message: string, context?: SafeContext) {
    console.warn(format(scope, message, context));
  },
  /**
   * `error` kann optional den ursprünglichen Fehler mitloggen – dessen
   * `message` landet im Log (fürs Debugging), NIE aber wird der Fehler roh
   * an den Client zurückgegeben (siehe Server Actions: dort immer eine
   * feste, freundliche deutsche Fehlermeldung zurückgeben).
   */
  error(scope: string, message: string, error?: unknown, context?: SafeContext) {
    const errorMessage = error instanceof Error ? error.message : error ? String(error) : undefined;
    console.error(format(scope, message, context), errorMessage ? `– ${errorMessage}` : "");
  },
};
