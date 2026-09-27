"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/data/business";
import { logActivity } from "@/lib/data/activity";
import { hasFeature } from "@/lib/entitlements";
import { canTransitionAppointmentStatus } from "@/lib/stateMachine";
import { logger } from "@/lib/logger";
import {
  appointmentSettingsSchema,
  blockedTimeSchema,
  updateAppointmentStatusSchema,
} from "@/lib/validation";
import type { AppointmentStatus } from "@/types/database";

export type AppointmentActionState = { error?: string; message?: string } | null;

const GENERIC_ERROR = "Das hat leider nicht funktioniert. Bitte versuche es erneut.";
const NOT_YOURS_ERROR = "Dieser Termin gehört nicht zu deinem Unternehmen.";

async function requireOwnBusiness() {
  const business = await getCurrentBusiness();
  if (!business) return { error: "Bitte melde dich erneut an." } as const;
  return { business } as const;
}

export async function updateAppointmentSettings(
  _prev: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  const parsed = appointmentSettingsSchema.safeParse({
    appointment_duration_minutes: Number(formData.get("appointment_duration_minutes")),
    appointment_buffer_minutes: Number(formData.get("appointment_buffer_minutes")),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  if (!hasFeature(ctx.business, "calendar")) {
    return { error: "Die Terminbuchung ist ab dem Pro-Plan verfügbar. Bitte upgrade dein Abo." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("businesses")
    .update({
      appointment_duration_minutes: parsed.data.appointment_duration_minutes,
      appointment_buffer_minutes: parsed.data.appointment_buffer_minutes,
    })
    .eq("id", ctx.business.id);

  if (error) {
    logger.error("appointments.updateSettings", "Update fehlgeschlagen", error, {
      businessId: ctx.business.id,
    });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/appointments");
  return { message: "Einstellungen gespeichert." };
}

export async function addBlockedTime(
  _prev: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  const parsed = blockedTimeSchema.safeParse({
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_times").insert({
    business_id: ctx.business.id,
    starts_at: new Date(parsed.data.starts_at).toISOString(),
    ends_at: new Date(parsed.data.ends_at).toISOString(),
    reason: parsed.data.reason || null,
  });

  if (error) {
    logger.error("appointments.addBlockedTime", "Insert fehlgeschlagen", error, {
      businessId: ctx.business.id,
    });
    return { error: GENERIC_ERROR };
  }

  revalidatePath("/dashboard/appointments");
  return { message: "Blockierte Zeit hinzugefügt." };
}

export async function removeBlockedTime(blockedTimeId: string): Promise<void> {
  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return;

  const supabase = await createClient();
  await supabase
    .from("blocked_times")
    .delete()
    .eq("id", blockedTimeId)
    .eq("business_id", ctx.business.id);

  revalidatePath("/dashboard/appointments");
}

export async function updateAppointmentStatus(
  _prev: AppointmentActionState,
  formData: FormData
): Promise<AppointmentActionState> {
  const parsed = updateAppointmentStatusSchema.safeParse({
    appointment_id: formData.get("appointment_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingabe." };
  }

  const ctx = await requireOwnBusiness();
  if ("error" in ctx) return ctx;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("appointments")
    .select("status, lead_id, quote_id")
    .eq("id", parsed.data.appointment_id)
    .eq("business_id", ctx.business.id)
    .maybeSingle();
  if (!current) {
    return { error: NOT_YOURS_ERROR };
  }

  const from = current.status as AppointmentStatus;
  if (!canTransitionAppointmentStatus(from, parsed.data.status)) {
    return { error: `Status kann nicht von "${from}" auf "${parsed.data.status}" geändert werden.` };
  }

  const { error } = await supabase
    .from("appointments")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.appointment_id)
    .eq("business_id", ctx.business.id);

  if (error) {
    logger.error("appointments.updateStatus", "Update fehlgeschlagen", error, {
      appointmentId: parsed.data.appointment_id,
    });
    return { error: GENERIC_ERROR };
  }

  await logActivity({
    businessId: ctx.business.id,
    leadId: current.lead_id,
    quoteId: current.quote_id,
    type: "appointment_status_changed",
    payload: { status: parsed.data.status },
  });

  revalidatePath("/dashboard/appointments");
  revalidatePath(`/dashboard/leads/${current.lead_id}`);
  return { message: "Termin aktualisiert." };
}
