import { createClient } from "@/lib/supabase/server";
import type { BusinessRow } from "@/types/database";

/**
 * Aktivierungs-Checkliste (Phase 2): bildet den Kern-Funnel VISITOR ->
 * ... -> FIRST WON CUSTOMER auf sichtbare, konkrete Schritte ab. Bewusst
 * KEIN generisches "Profil ausfüllen" ohne Bezug zum Funnel – jeder Punkt
 * entspricht einem Schritt, der den Nutzer naeher an den ersten bezahlten
 * Kunden bringt (siehe FINAL RULE der Produkt-Spezifikation).
 */
export interface ActivationItem {
  key: string;
  label: string;
  done: boolean;
  href: string;
}

export interface ActivationChecklist {
  items: ActivationItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
}

export async function getActivationChecklist(
  business: Pick<BusinessRow, "id" | "slug" | "published" | "logo_url">,
  counts: { leadCount: number; wonCount: number }
): Promise<ActivationChecklist> {
  const supabase = await createClient();

  const { count: serviceCount } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  let sentQuoteCount = 0;
  if (counts.leadCount > 0) {
    const { data: leads } = await supabase
      .from("leads")
      .select("id")
      .eq("business_id", business.id);
    const leadIds = (leads ?? []).map((l) => l.id);
    if (leadIds.length > 0) {
      const { count } = await supabase
        .from("quotes")
        .select("id", { count: "exact", head: true })
        .in("lead_id", leadIds)
        .neq("status", "draft");
      sentQuoteCount = count ?? 0;
    }
  }

  const items: ActivationItem[] = [
    {
      key: "profile",
      label: "Unternehmensprofil mit Logo vervollständigen",
      done: Boolean(business.logo_url),
      href: "/dashboard/profile",
    },
    {
      key: "service",
      label: "Erste Leistung anlegen",
      done: (serviceCount ?? 0) > 0,
      href: "/dashboard/services",
    },
    {
      key: "publish",
      label: "Anfrageseite veröffentlichen",
      done: business.published,
      href: "/dashboard/profile",
    },
    {
      key: "share",
      label: "Anfrage-Link teilen und erste Anfrage erhalten",
      done: counts.leadCount > 0,
      href: `/${business.slug}`,
    },
    {
      key: "quote",
      label: "Erstes Angebot versenden",
      done: sentQuoteCount > 0,
      href: "/dashboard/quotes",
    },
    {
      key: "won",
      label: "Ersten Kunden gewinnen",
      done: counts.wonCount > 0,
      href: "/dashboard/leads",
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  return {
    items,
    completedCount,
    totalCount: items.length,
    percent: Math.round((completedCount / items.length) * 100),
  };
}
