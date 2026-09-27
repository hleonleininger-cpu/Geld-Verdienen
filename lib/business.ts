import type { createClient } from "@/lib/supabase/server";

/**
 * Findet einen eindeutigen Slug, ausgehend von einer bevorzugten Basis
 * (z. B. aus dem Unternehmensnamen generiert). Wird sowohl beim
 * Onboarding als auch beim nachtraeglichen Umbenennen im Dashboard
 * verwendet.
 */
export async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  base: string,
  excludeBusinessId?: string
): Promise<string> {
  let candidate = base || "betrieb";
  let attempt = 0;
  while (attempt < 20) {
    let query = supabase.from("businesses").select("id").eq("slug", candidate);
    if (excludeBusinessId) {
      query = query.neq("id", excludeBusinessId);
    }
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    attempt += 1;
    candidate = `${base}-${attempt + 1}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 6)}`;
}
