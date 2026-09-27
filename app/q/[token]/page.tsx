import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyEUR, formatDateDe, QUOTE_STATUS_BADGE_CLASSES, QUOTE_STATUS_LABELS } from "@/lib/format";
import { getEffectiveQuoteStatus } from "@/lib/quotes";
import { track } from "@/lib/analytics";
import { Badge } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { QuoteActions } from "@/components/public/QuoteActions";
import type { PublicQuotePayload } from "@/types/database";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Der Public-Token ist die einzige Berechtigung fuer diese Seite (siehe
// AGENTS-Vorgabe "never use guessable numeric IDs as access credentials")
// – kein Login, keine sequentielle ID. Zugriff laeuft ausschliesslich ueber
// die SECURITY DEFINER RPCs `get_public_quote` / `record_public_quote_event`,
// damit auf `quotes`/`leads`/`businesses` keine zusaetzliche anon-RLS-Policy
// noetig ist.
async function loadQuote(token: string): Promise<PublicQuotePayload | null> {
  const supabase = await createClient();

  // "Angesehen"-Event: idempotent (die RPC aendert nur bei status='sent'
  // etwas), daher unconditional vor dem eigentlichen Lesen aufgerufen, damit
  // der direkt danach geladene Payload bereits den aktuellen Status zeigt.
  await supabase.rpc("record_public_quote_event", {
    p_public_token: token,
    p_event: "viewed",
  });

  const { data } = await supabase.rpc("get_public_quote", { p_public_token: token });
  if (data) {
    await track("quote_viewed");
  }
  return (data as PublicQuotePayload | null) ?? null;
}

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await loadQuote(token);
  if (!quote) notFound();

  const effectiveStatus = getEffectiveQuoteStatus(quote.status, quote.valid_until);
  const isActionable = effectiveStatus === "sent" || effectiveStatus === "viewed";

  return (
    <div className="min-h-screen bg-sand-100 py-8">
      <div className="container-app max-w-2xl">
        <div className="mb-5 flex items-center justify-between">
          <Logo />
          <Badge className={QUOTE_STATUS_BADGE_CLASSES[effectiveStatus]}>
            {QUOTE_STATUS_LABELS[effectiveStatus]}
          </Badge>
        </div>

        <div className="card-surface p-6 sm:p-10">
          <div className="flex items-start justify-between gap-4 border-b border-ink-100 pb-6">
            <div className="flex items-center gap-3">
              {quote.business_logo_url && (
                <Image
                  src={quote.business_logo_url}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="font-display text-xl font-semibold text-ink-950">
                  {quote.business_name}
                </p>
                {quote.business_phone && (
                  <p className="text-sm text-ink-500">{quote.business_phone}</p>
                )}
                {quote.business_email && (
                  <p className="text-sm text-ink-500">{quote.business_email}</p>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {quote.quote_number}
              </p>
              <p className="mt-1 text-sm text-ink-500">{formatDateDe(quote.created_at)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Für</p>
              <p className="mt-1 font-medium text-ink-900">{quote.customer_name}</p>
              <p className="text-sm text-ink-500">{quote.customer_email}</p>
            </div>
            {quote.valid_until && (
              <div className="sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Gültig bis
                </p>
                <p className="mt-1 font-medium text-ink-900">{formatDateDe(quote.valid_until)}</p>
              </div>
            )}
          </div>

          <div className="mt-6">
            <p className="font-display text-lg font-semibold text-ink-950">{quote.title}</p>
            {quote.description && (
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {quote.description}
              </p>
            )}
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-ink-100">
            <div className="flex items-center justify-between border-b border-ink-100 bg-sand-50 px-5 py-2.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
              <span>Position</span>
              <span>Betrag</span>
            </div>
            {quote.line_items.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between border-b border-ink-50 px-5 py-3 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-medium text-ink-900">{item.description}</p>
                  <p className="text-xs text-ink-400">
                    {item.quantity} × {formatCurrencyEUR(item.unit_price)}
                  </p>
                </div>
                <p className="whitespace-nowrap text-sm font-medium text-ink-900">
                  {formatCurrencyEUR(item.quantity * item.unit_price)}
                </p>
              </div>
            ))}
            <div className="space-y-1 bg-sand-50 px-5 py-4">
              <div className="flex justify-between text-sm text-ink-500">
                <span>Zwischensumme</span>
                <span>{formatCurrencyEUR(quote.subtotal)}</span>
              </div>
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-sm text-ink-500">
                  <span>Rabatt</span>
                  <span>-{formatCurrencyEUR(quote.discount_amount)}</span>
                </div>
              )}
              {quote.tax_rate > 0 && (
                <div className="flex justify-between text-sm text-ink-500">
                  <span>MwSt. ({quote.tax_rate}%)</span>
                  <span>{formatCurrencyEUR(quote.tax_amount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-1.5 font-display text-lg font-semibold text-ink-950">
                <span>Gesamt</span>
                <span>{formatCurrencyEUR(quote.price)}</span>
              </div>
            </div>
          </div>

          {quote.notes && (
            <div className="mt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Notizen</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {quote.notes}
              </p>
            </div>
          )}
          {quote.terms && (
            <p className="mt-6 whitespace-pre-line text-xs text-ink-400">{quote.terms}</p>
          )}

          <div className="mt-8">
            {isActionable ? (
              <QuoteActions token={token} />
            ) : effectiveStatus === "accepted" ? (
              <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-center text-sm font-medium text-brand-800">
                Dieses Angebot wurde angenommen.
              </div>
            ) : effectiveStatus === "declined" ? (
              <div className="rounded-xl border border-ink-100 bg-sand-50 px-5 py-4 text-center text-sm font-medium text-ink-600">
                Dieses Angebot wurde abgelehnt.
              </div>
            ) : (
              <div className="rounded-xl border border-ink-100 bg-sand-50 px-5 py-4 text-center text-sm font-medium text-ink-600">
                Dieses Angebot ist abgelaufen.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
