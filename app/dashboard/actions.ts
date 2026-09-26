"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import { INDUSTRIES } from "@/lib/industries";

export type BusinessActionState = { error?: string; message?: string } | null;

async function uniqueSlug(supabase: ReturnType<typeof createClient>, base: string) {
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
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const businessName = String(formData.get("business_name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!businessName) {
    return { error: "Bitte gib deinen Unternehmensnamen an." };
  }
  if (!(industry in INDUSTRIES)) {
    return { error: "Bitte wähle eine Branche aus." };
  }

  const slug = await uniqueSlug(supabase, slugify(businessName));

  const { error } = await supabase.from("businesses").insert({
    owner_id: userData.user.id,
    business_name: businessName,
    slug,
    industry,
    phone: phone || null,
    email: email || userData.user.email || null,
    description: description || null,
  });

  if (error) {
    return { error: "Unternehmen konnte nicht angelegt werden: " + error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Dein Unternehmen wurde angelegt!" };
}

export async function updateBusinessProfile(
  _prev: BusinessActionState,
  formData: FormData
): Promise<BusinessActionState> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return { error: "Bitte melde dich erneut an." };
  }

  const businessId = String(formData.get("business_id") ?? "");
  const businessName = String(formData.get("business_name") ?? "").trim();
  const industry = String(formData.get("industry") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!businessName) {
    return { error: "Bitte gib deinen Unternehmensnamen an." };
  }
  if (!(industry in INDUSTRIES)) {
    return { error: "Bitte wähle eine Branche aus." };
  }

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 3 * 1024 * 1024) {
      return { error: "Das Logo darf maximal 3 MB groß sein." };
    }
    const extension = logo.name.split(".").pop() ?? "png";
    const path = `${userData.user.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) {
      return { error: "Logo konnte nicht hochgeladen werden." };
    }
    logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      business_name: businessName,
      industry,
      phone: phone || null,
      email: email || null,
      description: description || null,
      ...(logoUrl ? { logo_url: logoUrl } : {}),
    })
    .eq("id", businessId)
    .eq("owner_id", userData.user.id);

  if (error) {
    return { error: "Profil konnte nicht gespeichert werden: " + error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { message: "Profil gespeichert." };
}
