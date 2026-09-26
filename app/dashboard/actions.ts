"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { logger } from "@/lib/logger";
import { createBusinessSchema, updateBusinessProfileSchema } from "@/lib/validation";

export type BusinessActionState = { error?: string; message?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 3 * 1024 * 1024;

async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string
) {
  let candidate = base || "betrieb";
  let attempt = 0;
  while (attempt < 20) {
    const { data } = await supabase
      .from("businesses")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}

export async function createBusiness(
  _prev: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const parsed = createBusinessSchema.safeParse({
    business_name: formData.get("business_name"),
    industry: formData.get("industry"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const slug = await uniqueSlug(supabase, slugify(parsed.data.business_name));

  const { error } = await supabase.from("businesses").insert({
    owner_id: userData.user.id,
    business_name: parsed.data.business_name,
    slug,
    industry: parsed.data.industry,
    phone: parsed.data.phone || null,
    email: parsed.data.email || userData.user.email || null,
    description: parsed.data.description || null,
  });

  if (error) {
    logger.error("business.create", "Insert fehlgeschlagen", error, {
      ownerId: userData.user.id,
    });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Dein Unternehmen wurde angelegt!" };
}

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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

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
    return { error: "Dieses Unternehmen gehört nicht zu deinem Konto." };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Profil gespeichert." };
}
