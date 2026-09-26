import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getIndustry } from "@/lib/industries";
import { LeadForm } from "@/components/public/LeadForm";
import { Logo } from "@/components/Logo";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getBusiness(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("businesses")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}): Promise<Metadata> {
  const { businessSlug } = await params;
  const business = await getBusiness(businessSlug);
  if (!business) return { title: "Nicht gefunden", robots: { index: false } };

  const title = `Anfrage an ${business.business_name}`;
  const description =
    business.description ?? `Stelle ${business.business_name} unverbindlich eine Anfrage.`;

  return {
    title,
    description,
    alternates: { canonical: `/${business.slug}` },
    openGraph: {
      title,
      description,
      url: `/${business.slug}`,
      type: "website",
    },
  };
}

export default async function BusinessLeadPage({
  params,
}: {
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getBusiness(businessSlug);
  if (!business) notFound();

  const industry = getIndustry(business.industry);

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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl2 bg-ink-950 font-display text-xl font-semibold text-brand-300 shadow-soft">
                {business.business_name.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h1 className="mt-4 font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
              {business.business_name}
            </h1>
            <p className="mt-1 text-sm font-medium text-brand-700">{industry.label}</p>
            {business.description && (
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
                {business.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-ink-400">
              {business.phone && <span>{business.phone}</span>}
              {business.email && <span>{business.email}</span>}
            </div>
          </div>

          <LeadForm businessId={business.id} serviceExamples={industry.exampleServices} />
        </div>
      </main>
    </div>
  );
}
