"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { uniqueSlug } from "@/lib/business";
import { slugify } from "@/lib/format";
import { logger } from "@/lib/logger";
import { track } from "@/lib/analytics";
import { TRIAL_LENGTH_DAYS } from "@/lib/entitlements";
import { getIndustry } from "@/lib/industries";
import {
  onboardingStep1Schema,
  onboardingStep2Schema,
  onboardingStep3Schema,
  onboardingStep6Schema,
  openingHoursSchema,
} from "@/lib/validation";
import type { OpeningHoursEntry } from "@/types/database";

export type OnboardingState = { error?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

function advanceStep(current: number, completedStep: number) {
  return Math.max(current, Math.min(10, completedStep + 1));
}

/**
 * Schritt 1: Unternehmensname. Legt bei Erstaufruf das Business an
 * (inkl. 14-taegigem Trial mit Pro-Funktionsumfang) oder aktualisiert es,
 * falls es (z. B. nach Verlassen und Zurueckkommen) schon existiert.
 * Idempotent: es gibt maximal EIN Business pro owner_id (siehe
 * getCurrentBusiness), ein erneuter Aufruf legt niemals ein zweites an.
 */
export async function onboardingStep1(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const parsed = onboardingStep1Schema.safeParse({
    business_name: formData.get("business_name"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("businesses")
    .select("id, onboarding_completed_at, slug")
    .eq("owner_id", user.id)
    .maybeSingle();

  const slug = await uniqueSlug(supabase, slugify(parsed.data.business_name), existing?.id);

  if (existing) {
    // Slug nur vor Abschluss des Onboardings neu generieren – danach ist
    // die oeffentliche URL "eingefroren" (koennte schon geteilt worden sein).
    const shouldUpdateSlug = !existing.onboarding_completed_at;
    const { error } = await supabase
      .from("businesses")
      .update({
        business_name: parsed.data.business_name,
        ...(shouldUpdateSlug ? { slug } : {}),
        onboarding_step: advanceStep(0, 1),
      })
      .eq("id", existing.id)
      .eq("owner_id", user.id);
    if (error) {
      logger.error("onboarding.step1", "Update fehlgeschlagen", error);
      return { error: GENERIC_ERROR };
    }
  } else {
    const now = new Date();
    const trialEnds = new Date(now.getTime() + TRIAL_LENGTH_DAYS * 24 * 60 * 60 * 1000);
    const cookieStore = await cookies();
    const referredByCode = cookieStore.get("ap_ref")?.value || null;

    const { data: inserted, error } = await supabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        business_name: parsed.data.business_name,
        slug,
        industry: "handwerk", // Platzhalter, wird in Schritt 2 gesetzt
        email: user.email ?? null,
        onboarding_step: 1,
        published: false,
        trial_started_at: now.toISOString(),
        trial_ends_at: trialEnds.toISOString(),
        subscription_status: "trialing",
        referred_by_code: referredByCode,
      })
      .select("id")
      .single();
    if (error || !inserted) {
      logger.error("onboarding.step1", "Insert fehlgeschlagen", error, { ownerId: user.id });
      return { error: GENERIC_ERROR };
    }

    if (referredByCode) {
      await supabase.from("referral_events").insert({
        referral_code: referredByCode,
        event_type: "signed_up",
        referred_business_id: inserted.id,
      });
    }

    await track("onboarding_started", { userId: user.id, businessId: inserted.id });
    await track("trial_started", { userId: user.id, businessId: inserted.id });
  }

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingStep2(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const parsed = onboardingStep2Schema.safeParse({ industry: formData.get("industry") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte wähle eine Branche." };
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const { error } = await supabase
    .from("businesses")
    .update({ industry: parsed.data.industry, onboarding_step: advanceStep(business.onboarding_step, 2) })
    .eq("id", business.id)
    .eq("owner_id", user.id);
  if (error) {
    logger.error("onboarding.step2", "Update fehlgeschlagen", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingStep3(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const parsed = onboardingStep3Schema.safeParse({
    description: formData.get("description"),
    tagline: formData.get("tagline"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const { error } = await supabase
    .from("businesses")
    .update({
      description: parsed.data.description || null,
      tagline: parsed.data.tagline || null,
      onboarding_step: advanceStep(business.onboarding_step, 3),
    })
    .eq("id", business.id)
    .eq("owner_id", user.id);
  if (error) {
    logger.error("onboarding.step3", "Update fehlgeschlagen", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/onboarding");
  return null;
}

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_LOGO_BYTES = 3 * 1024 * 1024;

export async function onboardingStep4Logo(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > MAX_LOGO_BYTES) {
      return { error: "Das Logo darf maximal 3 MB groß sein." };
    }
    if (!ALLOWED_LOGO_TYPES.includes(logo.type)) {
      return { error: "Erlaubt sind nur PNG-, JPG- oder WEBP-Bilder." };
    }
    const extension = logo.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const path = `${user.id}/logo.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from("logos")
      .upload(path, logo, { upsert: true, contentType: logo.type });
    if (uploadError) {
      logger.error("onboarding.step4", "Logo-Upload fehlgeschlagen", uploadError);
      return { error: "Logo konnte nicht hochgeladen werden." };
    }
    const logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
    await supabase.from("businesses").update({ logo_url: logoUrl }).eq("id", business.id);
  }

  await supabase
    .from("businesses")
    .update({ onboarding_step: advanceStep(business.onboarding_step, 4) })
    .eq("id", business.id)
    .eq("owner_id", user.id);

  revalidatePath("/onboarding");
  return null;
}

/**
 * Schritt 5: Standard-Leistungen anlegen (idempotent – nur wenn das
 * Business noch KEINE Leistungen hat, damit ein erneuter Besuch dieses
 * Schritts keine Duplikate erzeugt).
 */
export async function onboardingStep5(
  _prev: OnboardingState,
  _formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, industry, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const { count } = await supabase
    .from("services")
    .select("id", { count: "exact", head: true })
    .eq("business_id", business.id);

  if (!count || count === 0) {
    const industry = getIndustry(business.industry);
    const defaults = industry.services.slice(0, 3).map((service) => ({
      business_id: business.id,
      name: service.name,
      description: service.description ?? null,
      price: service.price,
      duration_minutes: service.duration_minutes,
      active: true,
    }));
    const { error } = await supabase.from("services").insert(defaults);
    if (error) {
      logger.error("onboarding.step5", "Standard-Leistungen konnten nicht angelegt werden", error);
    }
  }

  await supabase
    .from("businesses")
    .update({ onboarding_step: advanceStep(business.onboarding_step, 5) })
    .eq("id", business.id)
    .eq("owner_id", user.id);

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingStep6(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const parsed = onboardingStep6Schema.safeParse({
    phone: formData.get("phone"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const { error } = await supabase
    .from("businesses")
    .update({
      phone: parsed.data.phone || null,
      email: parsed.data.email || user.email || null,
      onboarding_step: advanceStep(business.onboarding_step, 6),
    })
    .eq("id", business.id)
    .eq("owner_id", user.id);
  if (error) {
    logger.error("onboarding.step6", "Update fehlgeschlagen", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingStep7(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const raw = String(formData.get("opening_hours") ?? "[]");
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw);
  } catch {
    return { error: "Ungültiges Format für Öffnungszeiten." };
  }
  const parsed = openingHoursSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return { error: "Bitte prüfe deine Öffnungszeiten." };
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const { error } = await supabase
    .from("businesses")
    .update({
      opening_hours: parsed.data as OpeningHoursEntry[],
      onboarding_step: advanceStep(business.onboarding_step, 7),
    })
    .eq("id", business.id)
    .eq("owner_id", user.id);
  if (error) {
    logger.error("onboarding.step7", "Update fehlgeschlagen", error);
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingStep8Publish(
  _prev: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const accentColor = String(formData.get("accent_color") ?? "").trim();
  if (accentColor && !/^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    return { error: "Bitte gib eine gültige Hex-Farbe an." };
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  const { error } = await supabase
    .from("businesses")
    .update({
      accent_color: accentColor || null,
      published: true,
      onboarding_step: advanceStep(business.onboarding_step, 8),
    })
    .eq("id", business.id)
    .eq("owner_id", user.id);
  if (error) {
    logger.error("onboarding.step8", "Veröffentlichen fehlgeschlagen", error);
    return { error: GENERIC_ERROR };
  }

  await track("business_page_published", { businessId: business.id, userId: user.id });

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingStep9(
  _prev: OnboardingState,
  _formData: FormData
): Promise<OnboardingState> {
  const user = await requireUser();
  if (!user) return { error: "Bitte melde dich erneut an." };

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_step")
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!business) return { error: "Bitte starte zuerst mit deinem Unternehmensnamen." };

  await supabase
    .from("businesses")
    .update({ onboarding_step: advanceStep(business.onboarding_step, 9) })
    .eq("id", business.id)
    .eq("owner_id", user.id);

  revalidatePath("/onboarding");
  return null;
}

export async function onboardingComplete(): Promise<void> {
  const user = await requireUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, onboarding_completed_at")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (business && !business.onboarding_completed_at) {
    await supabase
      .from("businesses")
      .update({ onboarding_step: 10, onboarding_completed_at: new Date().toISOString() })
      .eq("id", business.id);
    await track("onboarding_completed", { businessId: business.id, userId: user.id });
  }

  revalidatePath("/dashboard", "layout");
  redirect("/dashboard");
}
