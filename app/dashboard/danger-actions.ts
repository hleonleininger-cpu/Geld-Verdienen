"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type DangerActionState = { error?: string } | null;

/**
 * Löscht das Business samt aller Leads und Angebote (ON DELETE CASCADE,
 * siehe supabase/schema.sql). Der Login-Account selbst bleibt bestehen.
 * Erfordert exakte Bestätigung durch Eingabe des Unternehmensnamens, um
 * versehentliches Löschen zu verhindern.
 */
export async function deleteBusinessData(
  _prev: DangerActionState,
  formData: FormData
): Promise<DangerActionState> {
  const businessId = String(formData.get("business_id") ?? "");
  const expectedName = String(formData.get("expected_name") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");

  if (confirmation !== expectedName) {
    return { error: "Bitte gib den Unternehmensnamen exakt zur Bestätigung ein." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  // `.eq("owner_id", ...)` zusätzlich zu RLS: nur das eigene Business kann
  // hierüber gelöscht werden, niemals eines über eine manipulierte ID.
  const { error } = await supabase
    .from("businesses")
    .delete()
    .eq("id", businessId)
    .eq("owner_id", userData.user.id);

  if (error) {
    logger.error("business.deleteData", "Löschen fehlgeschlagen", error, {
      businessId,
    });
    return { error: "Löschen ist fehlgeschlagen. Bitte versuche es erneut." };
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}

/**
 * Löscht das komplette Konto: Business + Leads + Angebote (Cascade) sowie
 * den Supabase-Auth-Nutzer selbst. Das Löschen eines Auth-Nutzers ist eine
 * Admin-Operation und erfordert daher den Service-Role-Client – der
 * verwendet aber ausschließlich die ID des GERADE eingeloggten Nutzers,
 * niemals eine vom Client übergebene ID.
 */
export async function deleteAccount(
  _prev: DangerActionState,
  formData: FormData
): Promise<DangerActionState> {
  const confirmation = String(formData.get("confirmation") ?? "").trim().toLowerCase();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  if (confirmation !== (userData.user.email ?? "").toLowerCase()) {
    return { error: "Bitte gib deine E-Mail-Adresse exakt zur Bestätigung ein." };
  }

  const userId = userData.user.id;

  // Businesses (und per Cascade Leads/Quotes) des Nutzers loeschen.
  await supabase.from("businesses").delete().eq("owner_id", userId);

  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
  } catch (err) {
    logger.error("account.delete", "Auth-Nutzer konnte nicht gelöscht werden", err, {
      userId,
    });
    return {
      error:
        "Deine Daten wurden gelöscht, das Konto selbst konnte aber nicht vollständig entfernt werden. Bitte kontaktiere uns.",
    };
  }

  await supabase.auth.signOut();
  redirect("/");
}
