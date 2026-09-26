import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getLeadById, getQuotesForLead } from "@/lib/data/leads";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/Card";
import {
  formatDateDe,
  formatDateTimeDe,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from "@/lib/format";
import { getIndustry } from "@/lib/industries";
import { StatusActions } from "@/components/dashboard/leads/StatusActions";
import { ResponseGenerator } from "@/components/dashboard/leads/ResponseGenerator";
import { ReminderPanel } from "@/components/dashboard/leads/ReminderPanel";
import { QuoteForm } from "@/components/dashboard/leads/QuoteForm";
import { QuoteList } from "@/components/dashboard/leads/QuoteList";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [business, lead] = await Promise.all([getCurrentBusiness(), getLeadById(id)]);
  if (!business) return null;
  if (!lead || lead.business_id !== business.id) notFound();

  const quotes = await getQuotesForLead(lead.id);
  const industry = getIndustry(business.industry);

  let attachmentUrl: string | null = null;
  if (lead.attachment_url) {
    const supabase = await createClient();
    const { data } = await supabase.storage
      .from("lead-attachments")
      .createSignedUrl(lead.attachment_url, 60 * 60);
    attachmentUrl = data?.signedUrl ?? null;
  }

  const details: { label: string; value: string }[] = [
    { label: "E-Mail", value: lead.customer_email },
    { label: "Telefon", value: lead.customer_phone || "-" },
    { label: "Wunschtermin", value: formatDateDe(lead.preferred_date) },
    { label: "Ort", value: lead.location || "-" },
    { label: "Budget", value: lead.budget || "-" },
    { label: "Eingegangen am", value: formatDateTimeDe(lead.created_at) },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard"
        className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold text-ink-950">
              {lead.customer_name}
            </h1>
            <Badge className={STATUS_BADGE_CLASSES[lead.status]}>
              {STATUS_LABELS[lead.status]}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {lead.service} · {industry.label}
          </p>
        </div>
      </div>

      <StatusActions leadId={lead.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-6 lg:col-span-2">
          <h2 className="font-display text-lg font-semibold text-ink-950">Details</h2>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {details.map((detail) => (
              <div key={detail.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  {detail.label}
                </dt>
                <dd className="mt-1 text-sm text-ink-900">{detail.value}</dd>
              </div>
            ))}
          </dl>
          {lead.description && (
            <div className="mt-5">
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                Beschreibung
              </dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {lead.description}
              </dd>
            </div>
          )}
          {attachmentUrl && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
            >
              <Paperclip className="h-4 w-4" />
              Angehängte Datei ansehen
            </a>
          )}
        </div>

        <div className="card-surface p-6">
          <h2 className="font-display text-lg font-semibold text-ink-950">Angebote</h2>
          <div className="mt-4">
            <QuoteList quotes={quotes} />
          </div>
        </div>
      </div>

      <ResponseGenerator lead={lead} business={business} />

      <div id="angebot" className="card-surface p-6">
        <h2 className="font-display text-lg font-semibold text-ink-950">Angebot erstellen</h2>
        <p className="mt-1 text-sm text-ink-500">
          Titel und Preis sind bereits als Vorschlag für {industry.label} vorausgefüllt.
        </p>
        <div className="mt-4 max-w-lg">
          <QuoteForm
            leadId={lead.id}
            defaultTitle={industry.quoteSuggestion.title}
            defaultPrice={industry.quoteSuggestion.price}
          />
        </div>
      </div>

      <ReminderPanel leadId={lead.id} reminderAt={lead.reminder_at} />
    </div>
  );
}
