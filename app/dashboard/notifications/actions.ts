"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentBusiness } from "@/lib/data/business";
import { logger } from "@/lib/logger";

export async function markNotificationRead(notificationId: string): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("business_id", business.id);

  if (error) {
    logger.error("notifications.markRead", "Update fehlgeschlagen", error, { notificationId });
    return;
  }

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const business = await getCurrentBusiness();
  if (!business) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("business_id", business.id)
    .is("read_at", null);

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
