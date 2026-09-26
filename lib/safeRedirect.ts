/**
 * Verhindert einen Open-Redirect ueber nutzergesteuerte Redirect-Ziele
 * (z. B. `?redirectTo=`): erlaubt sind nur relative Pfade innerhalb der
 * eigenen App. Ein Wert wie `https://evil.example` oder `//evil.example`
 * (protokoll-relativ) wird verworfen. Ohne diese Pruefung koennte ein
 * Angreifer einen Link wie `/login?redirectTo=https://phishing.example`
 * verschicken, der nach einem ECHTEN, erfolgreichen Login auf einer
 * fremden Seite landet.
 */
export function safeRedirectTarget(
  value: string,
  fallback = "/dashboard"
): string {
  if (value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")) {
    return value;
  }
  return fallback;
}
