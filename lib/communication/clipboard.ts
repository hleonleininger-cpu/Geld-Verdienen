import type { MessageChannel, MessageProvider, SendMessageParams, SendMessageResult } from "@/lib/communication/types";

/**
 * Default-Provider: sendet NICHTS aktiv, sondern signalisiert dem Aufrufer
 * ehrlich, dass eine Nachricht nur zum manuellen Kopieren vorbereitet
 * werden kann (siehe `CopyMessageButton`). Kein externer Dienst, keine
 * Konfiguration noetig – funktioniert immer, "sendet" im eigentlichen
 * Sinne aber nie automatisch.
 */
export class ClipboardProvider implements MessageProvider {
  readonly name = "clipboard";

  canSend(_channel: MessageChannel): boolean {
    void _channel;
    return false;
  }

  async send(_params: SendMessageParams): Promise<SendMessageResult> {
    void _params;
    return {
      ok: false,
      error: "Automatischer Versand ist nicht eingerichtet. Bitte kopiere die Nachricht und versende sie manuell.",
    };
  }
}
