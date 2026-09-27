import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getFormsForBusiness } from "@/lib/data/forms";
import { Badge } from "@/components/ui/Card";
import { CreateFormForm } from "@/components/dashboard/forms/CreateFormForm";
import { CreateFormFromTemplateButton } from "@/components/dashboard/forms/CreateFormFromTemplateButton";
import { hasFeature } from "@/lib/entitlements";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";

export const metadata: Metadata = { title: "Formulare" };

export default async function FormsPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const forms = await getFormsForBusiness(business.id);
  const canCreate = hasFeature(business, "custom_forms");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Formulare</h1>
          <p className="mt-1 text-sm text-ink-500">
            Eigene Anfrageformulare unter /request/{business.slug}/formular-slug.
          </p>
        </div>
        {canCreate && (
          <div className="flex flex-wrap gap-2">
            {forms.length === 0 && <CreateFormFromTemplateButton />}
            <CreateFormForm />
          </div>
        )}
      </div>

      {!canCreate && (
        <UpgradeBanner
          title="Individuelle Formulare sind Teil des Pro-Plans"
          description="Erstelle beliebig viele eigene Anfrageformulare mit individuellen Feldern."
        />
      )}

      {forms.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <FileText className="h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">
            Noch keine eigenen Formulare. Dein Standard-Anfrageformular unter /{business.slug}
            funktioniert unabhängig davon weiter.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {forms.map((form) => (
            <Link
              key={form.id}
              href={`/dashboard/forms/${form.id}`}
              className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3.5 hover:border-ink-300"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink-900">{form.name}</p>
                  <Badge
                    className={
                      form.active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500"
                    }
                  >
                    {form.active ? "Aktiv" : "Entwurf"}
                  </Badge>
                </div>
                <p className="truncate text-xs text-ink-400">
                  /request/{business.slug}/{form.slug}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
