import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { User } from "@supabase/supabase-js";

/**
 * Service-Role-Client – umgeht RLS und darf NUR serverseitig für interne
 * Admin-Auswertungen genutzt werden (niemals im Client-Bundle importieren).
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ist nicht gesetzt. Ohne diesen Key kann der Admin-Bereich keine Auswertungen laden."
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Autorisierungsquelle fürs Admin-Backend:
 *
 * 1. `public.users.is_admin` (Datenbank) ist die eigentliche, produktive
 *    Quelle der Wahrheit. Dieses Flag kann NUR über den Service-Role-Key
 *    oder direkt im SQL-Editor gesetzt werden (siehe schema.sql) – es gibt
 *    bewusst keine RLS-UPDATE-Policy dafür, über die sich ein Nutzer selbst
 *    zum Admin machen könnte.
 * 2. `ADMIN_EMAILS` (Server-Umgebungsvariable, NICHT `NEXT_PUBLIC_`) ist nur
 *    ein Bootstrap-Fallback für die lokale Entwicklung, bevor überhaupt ein
 *    erster Admin-Datensatz existiert. Sie wird ausschließlich serverseitig
 *    ausgewertet und landet nie im Browser-Bundle.
 *
 * Diese Funktion prüft beide Quellen serverseitig – niemals über einen
 * Client-State oder eine Bedingung im UI.
 */
export async function isCurrentUserAdmin(): Promise<{ user: User | null; isAdmin: boolean }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { user: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("users")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const isAdmin = Boolean(profile?.is_admin) || getAdminEmails().includes((user.email ?? "").toLowerCase());
  return { user, isAdmin };
}
