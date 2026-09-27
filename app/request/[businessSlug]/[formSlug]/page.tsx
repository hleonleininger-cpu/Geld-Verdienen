import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicForm } from "@/lib/data/forms";
import { DynamicRequestForm } from "@/components/public/DynamicRequestForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string; formSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug, formSlug } = await params;
  const result = await getPublicForm(businessSlug, formSlug);
  if (!result) return { title: "Nicht gefunden", robots: { index: false, follow: false } };

  const title = `${result.form.name} – ${result.business.business_name}`;
  return {
    title,
    description: result.form.description ?? `Formular von ${result.business.business_name}`,
    robots: { index: false, follow: false },
  };
}

export default async function DynamicRequestFormPage({
  params,
}: {
  params: Promise<{ businessSlug: string; formSlug: string }>;
}) {
  const { businessSlug, formSlug } = await params;
  const result = await getPublicForm(businessSlug, formSlug);
  if (!result) notFound();

  const { business, form, fields } = result;
  const accentColor = business.accent_color;

  return (
    <div className="flex min-h-screen flex-col bg-sand-50">
      <header className="container-app flex h-16 items-center justify-between">
        <Link href="/" aria-label="AnfragePilot Startseite">
          <Logo />
        </Link>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-500 shadow-soft">
          Powered by AnfragePilot
        </span>
      </header>

      <main className="container-app flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-xl">
          <div className="mb-8 text-center">
            {business.logo_url ? (
              <Image
                src={business.logo_url}
                alt={business.business_name}
                width={64}
                height={64}
                className="mx-auto h-16 w-16 rounded-xl2 object-cover shadow-soft"
              />
            ) : (
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl2 bg-ink-950 font-display text-xl font-semibold text-brand-300 shadow-soft"
                style={accentColor ? { backgroundColor: accentColor } : undefined}
              >
                {business.business_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
              {form.name}
            </h1>
            <p className="mt-1 text-sm font-medium text-brand-700">{business.business_name}</p>
            {form.description && (
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
                {form.description}
              </p>
            )}
          </div>

          <DynamicRequestForm businessSlug={businessSlug} formSlug={formSlug} fields={fields} />
        </div>
      </main>
    </div>
  );
}
