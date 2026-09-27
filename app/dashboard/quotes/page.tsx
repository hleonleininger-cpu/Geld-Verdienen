import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getQuotesForBusiness } from "@/lib/data/leads";
import { Badge } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import {
  formatCurrencyEUR,
  formatDateDe,
  QUOTE_STATUS_BADGE_CLASSES,
  QUOTE_STATUS_LABELS,
} from "@/lib/format";
import { getEffectiveQuoteStatus } from "@/lib/quotes";

export const metadata: Metadata = { title: "Angebote" };

export default async function QuotesPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const quotes = await getQuotesForBusiness(business.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Angebote</h1>
        <p className="mt-1 text-sm text-ink-500">
          Alle Angebote über alle Anfragen hinweg – neueste zuerst.
        </p>
      </div>

      {quotes.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <FileText className="h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">
            Noch keine Angebote erstellt. Angebote werden direkt aus einer Anfrage heraus erstellt.
          </p>
          <ButtonLink href="/dashboard/leads">Zu den Anfragen</ButtonLink>
        </div>
      ) : (
        <div className="space-y-2.5">
          {quotes.map((quote) => {
            const effectiveStatus = getEffectiveQuoteStatus(quote.status, quote.valid_until);
            return (
              <Link
                key={quote.id}
                href={`/quotes/${quote.id}`}
                target="_blank"
                className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3.5 hover:border-ink-300"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-ink-900">{quote.title}</p>
                    <Badge className={QUOTE_STATUS_BADGE_CLASSES[effectiveStatus]}>
                      {QUOTE_STATUS_LABELS[effectiveStatus]}
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-400">
                    {quote.customer_name} · {quote.quote_number} · Gültig bis{" "}
                    {formatDateDe(quote.valid_until)}
                  </p>
                </div>
                <p className="font-display font-semibold text-ink-950">
                  {formatCurrencyEUR(quote.price)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
