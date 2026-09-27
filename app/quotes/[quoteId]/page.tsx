import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/business";
import {
  formatCurrencyEUR,
  formatDateDe,
  formatDateTimeDe,
  QUOTE_STATUS_BADGE_CLASSES,
  QUOTE_STATUS_LABELS,
} from "@/lib/format";
import { getEffectiveQuoteStatus } from "@/lib/quotes";
import { Badge } from "@/components/ui/Card";
import { PrintButton } from "@/components/PrintButton";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { CopyMessageButton } from "@/components/CopyMessageButton";
import { buildQuoteMessage } from "@/lib/communication/templates";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function QuotePage({
  params,
}: {
  params: Promise<{ quoteId: string }>;
}) {
  const { quoteId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) notFound();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", quote.lead_id)
    .maybeSingle();
  if (!lead) notFound();

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", lead.business_id)
    .maybeSingle();
  if (!business) notFound();

  // Explizite Ownership-Pruefung zusaetzlich zu RLS ("Do not rely on UI
  // restrictions as authorization" – hier zusaetzlich nicht nur auf RLS):
  // `businesses_select_public` erlaubt JEDEM eingeloggten Nutzer, fremde
  // Business-Datensaetze zu lesen (oeffentliche Anfrageseite!), daher darf
  // diese Seite sich nicht allein auf "die Query kam zurueck" verlassen.
  if (business.owner_id !== user.id) notFound();

  const effectiveStatus = getEffectiveQuoteStatus(quote.status, quote.valid_until);
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/q/${quote.public_token}`;
  const quoteMessage = buildQuoteMessage({
    customerName: lead.customer_name,
    businessName: business.business_name,
    quoteUrl: publicUrl,
    totalFormatted: formatCurrencyEUR(quote.price),
  });

  return (
    <div className="min-h-screen bg-sand-100 py-8 print:bg-white print:py-0">
      <div className="container-app max-w-2xl">
        <div className="no-print mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={`/dashboard/leads/${lead.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Anfrage
          </Link>
          <div className="flex flex-wrap gap-2">
            {quote.status !== "draft" && (
              <>
                <CopyLinkButton url={publicUrl} label="Kundenlink kopieren" />
                <CopyMessageButton template={quoteMessage} label="Nachricht kopieren" />
              </>
            )}
            <PrintButton>Als PDF speichern</PrintButton>
          </div>
        </div>

        <div className="print-area card-surface p-8 sm:p-12">
          <div className="flex items-start justify-between border-b border-ink-100 pb-6">
            <div>
              <p className="font-display text-xl font-semibold text-ink-950">
                {business.business_name}
              </p>
              <p className="mt-1 text-sm text-ink-500">{business.phone}</p>
              <p className="text-sm text-ink-500">{business.email}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {quote.quote_number}
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {formatDateDe(quote.created_at)}
              </p>
              <Badge className={`mt-1.5 ${QUOTE_STATUS_BADGE_CLASSES[effectiveStatus]}`}>
                {QUOTE_STATUS_LABELS[effectiveStatus]}
              </Badge>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Für
              </p>
              <p className="mt-1 font-medium text-ink-900">{lead.customer_name}</p>
              <p className="text-sm text-ink-500">{lead.customer_email}</p>
              {lead.customer_phone && (
                <p className="text-sm text-ink-500">{lead.customer_phone}</p>
              )}
              {lead.location && <p className="text-sm text-ink-500">{lead.location}</p>}
            </div>
            <div className="sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Gültig bis
              </p>
              <p className="mt-1 font-medium text-ink-900">
                {formatDateDe(quote.valid_until)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <p className="font-medium text-ink-900">{quote.title}</p>
            {quote.description && (
              <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-500">
                {quote.description}
              </p>
            )}
          </div>

          <div className="mt-4 rounded-xl border border-ink-100">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Position
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Betrag
              </p>
            </div>
            {quote.line_items.map((item, index) => (
              <div
                key={index}
                className="flex items-start justify-between border-b border-ink-50 px-5 py-3.5 last:border-b-0"
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
            <div className="space-y-1 border-t border-ink-100 px-5 py-4">
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

          <p className="mt-8 text-xs text-ink-400">
            Erstellt am {formatDateTimeDe(quote.created_at)} · Angebot freibleibend, Preis inkl. Anfahrt sofern nicht anders angegeben.
          </p>
        </div>
      </div>
    </div>
  );
}
