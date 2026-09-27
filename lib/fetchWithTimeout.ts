/**
 * `fetch`, aber mit hartem Timeout ueber die Standard-`AbortSignal.timeout()`-
 * API. Jede externe HTTP-Integration (Stripe, Resend, ...) MUSS hierueber
 * laufen statt rohes `fetch` zu verwenden: ohne Timeout kann ein stockender
 * Anbieter einen ganzen Request (Lead-Erstellung, Angebotsversand, Checkout)
 * unbegrenzt blockieren, statt schnell und sichtbar fehlzuschlagen (siehe
 * Section 18, "for every external integration: timeout, failure logging,
 * safe fallback").
 */
export async function fetchWithTimeout(
  input: string,
  init: RequestInit = {},
  timeoutMs = 8000
): Promise<Response> {
  return fetch(input, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
