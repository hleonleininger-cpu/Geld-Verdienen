"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { hasFeature } from "@/lib/entitlements";
import { updateBusinessProfileSchema, openingHoursSchema } from "@/lib/validation";

export type BusinessActionState = { error?: string; message?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
const NOT_YOURS_ERROR = "Dieses Unternehmen gehört nicht zu deinem Konto.";
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 3 * 1024 * 1024;
const ALLOWED_GALLERY_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_GALLERY_BYTES = 5 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 8;

export async function updateBusinessProfile(
  _prev: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const parsed = updateBusinessProfileSchema.safeParse({
    business_id: formData.get("business_id"),
    business_name: formData.get("business_name"),
    industry: formData.get("industry"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    description: formData.get("description"),
    tagline: formData.get("tagline"),
    accent_color: formData.get("accent_color"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const { data: current } = await supabase
    .from("businesses")
    .select("slug, plan, subscription_status, trial_ends_at, accent_color")
    .eq("id", parsed.data.business_id)
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  if (!current) {
    return { error: NOT_YOURS_ERROR };
  }

  // Custom-Branding (Akzentfarbe) ist ein Paid-/Trial-Feature. Ein Nutzer
  // ohne diese Berechtigung kann hier keine neue Farbe setzen (serverseitig
  // durchgesetzt, nicht nur im UI versteckt) – eine bereits gesetzte Farbe
  // bleibt beim Downgrade erhalten, wird aber auf der oeffentlichen Seite
  // nicht mehr angewendet (siehe app/[businessSlug]/page.tsx).
  const canBrand = hasFeature(current, "custom_branding");
  const accentColor = canBrand ? parsed.data.accent_color || null : current.accent_color;

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) {
      return { error: "Das Logo darf maximal 3 MB groß sein." };
    }
    if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
      return { error: "Erlaubt sind nur PNG-, JPG- oder WEBP-Bilder." };
    }
    const extension = logo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${userData.user.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) {
      logger.error("business.updateProfile", "Logo-Upload fehlgeschlagen", uploadError, {
        ownerId: userData.user.id,
      });
      return { error: "Logo konnte nicht hochgeladen werden." };
    }
    logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
  }

  // `.eq("owner_id", ...)` ist zusaetzlich zu RLS (businesses_update_own)
  // gesetzt: so bekommen wir unten ueber `data`/`count` eine ehrliche
  // Rueckmeldung, falls `business_id` aus irgendeinem Grund nicht (mehr)
  // dem eingeloggten Nutzer gehoert, statt eines stillen No-ops.
  const { data, error } = await supabase
    .from("businesses")
    .update({
      business_name: parsed.data.business_name,
      industry: parsed.data.industry,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      description: parsed.data.description || null,
      tagline: parsed.data.tagline || null,
      accent_color: accentColor,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .eq("id", parsed.data.business_id)
    .eq("owner_id", userData.user.id)
    .select("id");

  if (error) {
    logger.error("business.updateProfile", "Update fehlgeschlagen", error, {
      businessId: parsed.data.business_id,
    });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath(`/${current.slug}`);
  return { message: "Profil gespeichert." };
}

export async function togglePublished(
  _prev: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const businessId = String(formData.get("business_id") ?? "");
  const published = formData.get("published") === "true";

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const { data, error } = await supabase
    .from("businesses")
    .update({ published })
    .eq("id", businessId)
    .eq("owner_id", userData.user.id)
    .select("id");

  if (error) {
    logger.error("business.togglePublished", "Update fehlgeschlagen", error, { businessId });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  return { message: published ? "Seite veröffentlicht." : "Seite offline genommen." };
}

export async function updateOpeningHours(
  _prev: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const businessId = String(formData.get("business_id") ?? "");

  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("opening_hours") ?? "[]"));
  } catch {
    return { error: "Ungültige Öffnungszeiten." };
  }
  const parsed = openingHoursSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "Ungültige Öffnungszeiten." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const { data, error } = await supabase
    .from("businesses")
    .update({ opening_hours: parsed.data })
    .eq("id", businessId)
    .eq("owner_id", userData.user.id)
    .select("id");

  if (error) {
    logger.error("business.updateOpeningHours", "Update fehlgeschlagen", error, { businessId });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: NOT_YOURS_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Öffnungszeiten gespeichert." };
}

export async function addGalleryImage(
  _prev: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const businessId = String(formData.get("business_id") ?? "");
  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bitte wähle ein Bild aus." };
  }
  if (file.size > MAX_GALLERY_BYTES) {
    return { error: "Das Bild darf maximal 5 MB groß sein." };
  }
  if (!ALLOWED_GALLERY_TYPES.includes(file.type)) {
    return { error: "Erlaubt sind nur PNG-, JPG- oder WEBP-Bilder." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const { data: current } = await supabase
    .from("businesses")
    .select("gallery_urls")
    .eq("id", businessId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  if (!current) {
    return { error: NOT_YOURS_ERROR };
  }
  if (current.gallery_urls.length >= MAX_GALLERY_IMAGES) {
    return { error: `Maximal ${MAX_GALLERY_IMAGES} Bilder in der Galerie.` };
  }

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${userData.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("gallery")
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    logger.error("business.addGalleryImage", "Upload fehlgeschlagen", uploadError, { businessId });
    return { error: GENERIC_ERROR };
  }
  const publicUrl = supabase.storage.from("gallery").getPublicUrl(path).data.publicUrl;

  const { error } = await supabase
    .from("businesses")
    .update({ gallery_urls: [...current.gallery_urls, publicUrl] })
    .eq("id", businessId)
    .eq("owner_id", userData.user.id);
  if (error) {
    logger.error("business.addGalleryImage", "Update fehlgeschlagen", error, { businessId });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Bild hinzugefügt." };
}

export async function removeGalleryImage(businessId: string, url: string): Promise<void> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return;

  const { data: current } = await supabase
    .from("businesses")
    .select("gallery_urls")
    .eq("id", businessId)
    .eq("owner_id", userData.user.id)
    .maybeSingle();
  if (!current) return;

  await supabase
    .from("businesses")
    .update({ gallery_urls: current.gallery_urls.filter((u: string) => u !== url) })
    .eq("id", businessId)
    .eq("owner_id", userData.user.id);

  // Storage-Objekt best-effort loeschen (Pfad aus der public URL extrahiert).
  // Schlaegt das fehl, bleibt eine verwaiste Datei im Bucket liegen – das
  // ist unschoen, aber nie sicherheitsrelevant (kein anon-Read auf private
  // Pfade) und blockiert nie das Entfernen aus der sichtbaren Galerie.
  const marker = "/object/public/gallery/";
  const idx = url.indexOf(marker);
  if (idx !== -1) {
    const path = url.slice(idx + marker.length);
    await supabase.storage.from("gallery").remove([path]);
  }

  revalidatePath("/dashboard", "layout");
}
