import { headers } from "next/headers";

/**
 * Liest die Client-IP aus den Proxy-Headern (Cloudflare setzt `cf-connecting-ip`,
 * die meisten anderen Proxies `x-forwarded-for`). Ohne Proxy (lokal) gibt es
 * keinen zuverlässigen Header – dann wird ein fester Platzhalter genutzt,
 * wodurch alle lokalen Anfragen sich einen Rate-Limit-Zähler teilen (für
 * lokale Entwicklung unkritisch).
 */
export async function getClientIp(): Promise<string> {
  const headerList = await headers();
  const cfIp = headerList.get("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]!.trim();

  return "unknown";
}

/**
 * Hasht die IP mit SHA-256 (Web Crypto API – funktioniert identisch unter
 * Node.js und der Cloudflare-Workers-Runtime), damit wir keine rohen IP-
 * Adressen dauerhaft in der Datenbank speichern ("sensible Kundendaten
 * nicht unnötig speichern").
 */
export async function hashIp(ip: string): Promise<string> {
  const data = new TextEncoder().encode(ip);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
