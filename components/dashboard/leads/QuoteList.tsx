"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Badge } from "@/components/ui/Card";
import { formatCurrencyEUR, formatDateDe, QUOTE_STATUS_BADGE_CLASSES, QUOTE_STATUS_LABELS } from "@/lib/format";
import { getEffectiveQuoteStatus } from "@/lib/quotes";
import { sendQuote, type LeadActionState } from "@/app/dashboard/leads/actions";
import type { QuoteRow } from "@/types/database";

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-semibold text-brand-700 hover:underline disabled:opacity-50"
    >
      {pending ? "Wird versendet…" : "Senden"}
    </button>
  );
}

function SendQuoteForm({ quoteId }: { quoteId: string }) {
  const initialState: LeadActionState = null;
  const [state, formAction] = useActionState(sendQuote, initialState);
  return (
    <form action={formAction} onClick={(e) => e.stopPropagation()}>
      <input type="hidden" name="quote_id" value={quoteId} />
      <SendButton />
      {state?.error && <p className="mt-1 text-xs text-red-600">{state.error}</p>}
    </form>
  );
}

export function QuoteList({ quotes }: { quotes: QuoteRow[] }) {
  if (quotes.length === 0) {
    return <p className="text-sm text-ink-400">Noch keine Angebote erstellt.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {quotes.map((quote) => {
        const effectiveStatus = getEffectiveQuoteStatus(quote.status, quote.valid_until);
        return (
          <li key={quote.id} className="rounded-xl border border-ink-100 px-4 py-3 hover:border-ink-300">
            <Link href={`/quotes/${quote.id}`} target="_blank" className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink-900">{quote.title}</p>
                  <Badge className={QUOTE_STATUS_BADGE_CLASSES[effectiveStatus]}>
                    {QUOTE_STATUS_LABELS[effectiveStatus]}
                  </Badge>
                </div>
                <p className="text-xs text-ink-400">
                  {quote.quote_number} · Gültig bis {formatDateDe(quote.valid_until)}
                </p>
              </div>
              <p className="font-display font-semibold text-ink-950">
                {formatCurrencyEUR(quote.price)}
              </p>
            </Link>
            {quote.status === "draft" && (
              <div className="mt-2">
                <SendQuoteForm quoteId={quote.id} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
