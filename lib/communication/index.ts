import { ClipboardProvider } from "@/lib/communication/clipboard";
import type { MessageProvider } from "@/lib/communication/types";

export type {
  MessageChannel,
  MessageProvider,
  MessageTemplate,
  SendMessageParams,
  SendMessageResult,
} from "@/lib/communication/types";

/**
 * Aktuell wird ausschliesslich `ClipboardProvider` zurueckgegeben – es gibt
 * (noch) keinen echten Versanddienst. Ein zukuenftiger E-Mail-/SMS-/
 * WhatsApp-Provider wird hier registriert, sobald echte Zugangsdaten
 * konfiguriert sind (gleiches Muster wie `lib/billing/index.ts`).
 */
export function getMessageProvider(): MessageProvider {
  return new ClipboardProvider();
}
