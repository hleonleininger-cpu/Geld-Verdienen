"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

// Faengt Fehler ab, die sogar im Root-Layout selbst auftreten. Next.js
// verlangt hier ein eigenes <html>/<body>, da das normale Layout in diesem
// Fall nicht mehr gerendert wird. Bewusst mit Inline-Styles statt Tailwind-
// Klassen, damit die Seite auch dann lesbar bleibt, wenn genau der Fehler,
// der hierher gefuehrt hat, mit dem Styling-Setup zusammenhaengt.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("app.globalError", "Kritischer Rendering-Fehler im Root-Layout", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="de">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          color: "#0f1420",
          background: "#fbfaf7",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>
          AnfragePilot ist gerade nicht erreichbar
        </h1>
        <p style={{ maxWidth: "24rem", color: "#4a5570", fontSize: "0.9rem" }}>
          Es gab ein unerwartetes Problem beim Laden der Seite. Bitte lade die
          Seite neu.
        </p>
        <button
          onClick={reset}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "0.5rem",
            background: "#0f1420",
            color: "white",
            fontWeight: 500,
            border: "none",
            cursor: "pointer",
          }}
        >
          Erneut versuchen
        </button>
      </body>
    </html>
  );
}
