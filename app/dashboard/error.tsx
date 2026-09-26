"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { logger } from "@/lib/logger";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("dashboard.errorBoundary", "Fehler im Dashboard", error, {
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="card-surface flex flex-col items-center gap-4 p-10 text-center">
      <h2 className="font-display text-xl font-semibold text-ink-950">
        Dashboard konnte nicht geladen werden
      </h2>
      <p className="max-w-sm text-sm text-ink-500">
        Es gab ein unerwartetes Problem. Bitte versuche es erneut.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg border border-ink-200 px-4 py-2.5 text-sm font-medium text-ink-700 hover:border-ink-300"
        >
          Zur Übersicht
        </Link>
      </div>
    </div>
  );
}
