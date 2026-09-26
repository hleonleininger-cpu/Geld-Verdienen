import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Daten-Export (Art. 20 DSGVO – "Recht auf Datenübertragbarkeit" – die
 * rechtliche Einordnung sollte trotzdem von einer Rechtsberatung bestätigt
 * werden, dies ist nur die technische Umsetzung).
 *
 * Liefert alle Daten des eingeloggten Unternehmers als JSON-Datei aus:
 * eigenes Business, alle eigenen Leads, alle eigenen Angebote. Nutzt den
 * normalen, RLS-gebundenen Client – es kann also technisch gar nicht mehr
 * als die eigenen Daten zurückgegeben werden.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", userData.user.id)
    .maybeSingle();

  let leads: unknown[] = [];
  let quotes: unknown[] = [];

  if (business) {
    const { data: leadRows } = await supabase
      .from("leads")
      .select("*")
      .eq("business_id", business.id);
    leads = leadRows ?? [];

    const leadIds = leads.map((l) => (l as { id: string }).id);
    if (leadIds.length > 0) {
      const { data: quoteRows } = await supabase
        .from("quotes")
        .select("*")
        .in("lead_id", leadIds);
      quotes = quoteRows ?? [];
    }
  }

  const payload = {
    exported_at: new Date().toISOString(),
    account_email: userData.user.email,
    business,
    leads,
    quotes,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="anfragepilot-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
