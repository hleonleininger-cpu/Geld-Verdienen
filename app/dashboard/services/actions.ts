"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/data/business";
import { logger } from "@/lib/logger";
import { serviceSchema, updateServiceSchema } from "@/lib/validation";

export type ServiceActionState = { error?: string; message?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";

function parseServiceForm(formData: FormData) {
  const priceRaw = String(formData.get("price") ?? "").trim();
  const durationRaw = String(formData.get("duration_minutes") ?? "").trim();
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    price: priceRaw ? Number.parseFloat(priceRaw.replace(",", ".")) : null,
    duration_minutes: durationRaw ? Number.parseInt(durationRaw, 10) : null,
    active: formData.get("active_on") === "true",
  };
}

export async function createService(
  _prev: ServiceActionState,
  formData: FormData
): Promise<ServiceActionState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Bitte melde dich erneut an." };

  const parsed = serviceSchema.safeParse(parseServiceForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    business_id: business.id,
    name: parsed.data.name,
    description: parsed.data.description || null,
    category: parsed.data.category || null,
    price: parsed.data.price ?? null,
    duration_minutes: parsed.data.duration_minutes ?? null,
    active: parsed.data.active,
  });

  if (error) {
    logger.error("services.create", "Insert fehlgeschlagen", error, { businessId: business.id });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/services");
  revalidatePath(`/${business.slug}`);
  return { message: "Leistung angelegt." };
}

export async function updateService(
  _prev: ServiceActionState,
  formData: FormData
): Promise<ServiceActionState> {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Bitte melde dich erneut an." };

  const parsed = updateServiceSchema.safeParse({
    service_id: formData.get("service_id"),
    ...parseServiceForm(formData),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Bitte prüfe deine Angaben." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .update({
      name: parsed.data.name,
      description: parsed.data.description || null,
      category: parsed.data.category || null,
      price: parsed.data.price ?? null,
      duration_minutes: parsed.data.duration_minutes ?? null,
      active: parsed.data.active,
    })
    .eq("id", parsed.data.service_id)
    .eq("business_id", business.id)
    .select("id");

  if (error) {
    logger.error("services.update", "Update fehlgeschlagen", error, {
      serviceId: parsed.data.service_id,
    });
    return { error: GENERIC_ERROR };
  }
  if (!data || data.length === 0) {
    return { error: "Diese Leistung gehört nicht zu deinem Unternehmen." };
  }

  revalidatePath("/dashboard/services");
  revalidatePath(`/${business.slug}`);
  return { message: "Leistung aktualisiert." };
}

export async function deleteService(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const serviceId = String(formData.get("service_id") ?? "");
  const supabase = await createClient();
  await supabase.from("services").delete().eq("id", serviceId).eq("business_id", business.id);

  revalidatePath("/dashboard/services");
  revalidatePath(`/${business.slug}`);
}

export async function toggleServiceActive(formData: FormData): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const serviceId = String(formData.get("service_id") ?? "");
  const active = formData.get("active") === "true";
  const supabase = await createClient();
  await supabase
    .from("services")
    .update({ active })
    .eq("id", serviceId)
    .eq("business_id", business.id);

  revalidatePath("/dashboard/services");
  revalidatePath(`/${business.slug}`);
}
