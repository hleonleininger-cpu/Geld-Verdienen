"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Nur serverseitig sichtbare Details (digest) loggen, niemals die rohe
    // Fehlermeldung an den Nutzer weitergeben – die UI unten zeigt bewusst
    // nur eine generische, freundliche Meldung.
    logger.error("app.errorBoundary", "Unerwarteter Rendering-Fehler", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="font-display text-2xl font-semibold text-ink-950">
        Etwas ist schiefgelaufen
      </h1>
      <p className="max-w-sm text-sm text-ink-500">
        Es gab ein unerwartetes Problem. Bitte versuche es erneut – falls es
        weiterhin auftritt, melde dich gerne bei uns.
      </p>
      <Button onClick={reset}>Erneut versuchen</Button>
    </div>
  );
}
