import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getFormById, getFieldsForForm } from "@/lib/data/forms";
import { FormSettings } from "@/components/dashboard/forms/FormSettings";
import { FieldRow } from "@/components/dashboard/forms/FieldRow";
import { AddFieldForm } from "@/components/dashboard/forms/AddFieldForm";
import { CopyLinkButton } from "@/components/CopyLinkButton";

export const metadata: Metadata = { title: "Formular bearbeiten" };

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ formId: string }>;
}) {
  const { formId } = await params;
  const business = await getCurrentBusiness();
  if (!business) return null;

  const form = await getFormById(formId);
  if (!form || form.business_id !== business.id) notFound();

  const fields = await getFieldsForForm(form.id);
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/request/${business.slug}/${form.slug}`;

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard/forms"
        className="flex items-center gap-1.5 text-sm font-medium text-ink-600 hover:text-ink-950"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Formularen
      </Link>

      <FormSettings form={form} />

      <div className="card-surface flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Öffentlicher Link
          </p>
          <p className="truncate text-sm font-medium text-ink-900">{publicUrl}</p>
        </div>
        <CopyLinkButton url={publicUrl} />
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold text-ink-950">Felder</h2>
        <p className="mt-1 text-sm text-ink-500">
          Name und E-Mail werden auf jedem Formular immer erfasst. Hier legst du zusätzliche
          Felder fest.
        </p>

        {fields.length === 0 ? (
          <div className="card-surface mt-4 flex flex-col items-center gap-3 p-8 text-center">
            <ListChecks className="h-8 w-8 text-ink-300" />
            <p className="text-sm text-ink-500">Noch keine Felder angelegt.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2.5">
            {fields.map((field, index) => (
              <FieldRow
                key={field.id}
                formId={form.id}
                field={field}
                isFirst={index === 0}
                isLast={index === fields.length - 1}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <AddFieldForm formId={form.id} />
        </div>
      </div>
    </div>
  );
}
