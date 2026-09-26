import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/data/business";
import { formatCurrencyEUR, formatDateDe, formatDateTimeDe } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";

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

  return (
    <div className="min-h-screen bg-sand-100 py-8 print:bg-white print:py-0">
      <div className="container-app max-w-2xl">
        <div className="no-print mb-5 flex items-center justify-between">
          <Link
            href={`/dashboard/leads/${lead.id}`}
            className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Anfrage
          </Link>
          <PrintButton>Als PDF speichern</PrintButton>
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
                Angebot
              </p>
              <p className="mt-1 text-sm text-ink-500">
                {formatDateDe(quote.created_at)}
              </p>
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

          <div className="mt-8 rounded-xl border border-ink-100">
            <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Leistung
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Preis
              </p>
            </div>
            <div className="flex items-start justify-between px-5 py-5">
              <div>
                <p className="font-medium text-ink-900">{quote.title}</p>
                {quote.description && (
                  <p className="mt-1 max-w-md text-sm leading-relaxed text-ink-500">
                    {quote.description}
                  </p>
                )}
              </div>
              <p className="whitespace-nowrap font-display text-lg font-semibold text-ink-950">
                {formatCurrencyEUR(quote.price)}
              </p>
            </div>
            <div className="flex items-center justify-between border-t border-ink-100 px-5 py-3.5">
              <p className="font-medium text-ink-900">Gesamt</p>
              <p className="font-display text-xl font-semibold text-ink-950">
                {formatCurrencyEUR(quote.price)}
              </p>
            </div>
          </div>

          <p className="mt-8 text-xs text-ink-400">
            Erstellt am {formatDateTimeDe(quote.created_at)} · Angebot freibleibend, Preis inkl. Anfahrt sofern nicht anders angegeben.
          </p>
        </div>
      </div>
    </div>
  );
}
