import Link from "next/link";
import { formatCurrencyEUR, formatDateDe } from "@/lib/format";
import type { QuoteRow } from "@/types/database";

export function QuoteList({ quotes }: { quotes: QuoteRow[] }) {
  if (quotes.length === 0) {
    return <p className="text-sm text-ink-400">Noch keine Angebote erstellt.</p>;
  }

  return (
    <ul className="space-y-2.5">
      {quotes.map((quote) => (
        <li key={quote.id}>
          <Link
            href={`/quotes/${quote.id}`}
            target="_blank"
            className="flex items-center justify-between rounded-xl border border-ink-100 px-4 py-3 hover:border-ink-300"
          >
            <div>
              <p className="text-sm font-medium text-ink-900">{quote.title}</p>
              <p className="text-xs text-ink-400">
                Gültig bis {formatDateDe(quote.valid_until)}
              </p>
            </div>
            <p className="font-display font-semibold text-ink-950">
              {formatCurrencyEUR(quote.price)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
