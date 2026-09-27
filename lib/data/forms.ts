import { createClient } from "@/lib/supabase/server";
import type { BusinessRow, RequestFormFieldRow, RequestFormRow } from "@/types/database";

export async function getFormsForBusiness(businessId: string): Promise<RequestFormRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("request_forms")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getFormById(formId: string): Promise<RequestFormRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("request_forms")
    .select("*")
    .eq("id", formId)
    .maybeSingle();
  return data ?? null;
}

export async function getFieldsForForm(formId: string): Promise<RequestFormFieldRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("request_form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("position", { ascending: true });
  return data ?? [];
}

export type PublicFormBusiness = Pick<
  BusinessRow,
  "id" | "business_name" | "slug" | "logo_url" | "accent_color"
>;

/**
 * Laedt ein oeffentliches, aktives Formular per Business-/Formular-Slug.
 * Liefert `null`, wenn das Business nicht veroeffentlicht ist oder das
 * Formular nicht existiert/deaktiviert ist – in beiden Faellen zeigt die
 * aufrufende Seite `notFound()`.
 */
export async function getPublicForm(
  businessSlug: string,
  formSlug: string
): Promise<{ business: PublicFormBusiness; form: RequestFormRow; fields: RequestFormFieldRow[] } | null> {
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, business_name, slug, logo_url, accent_color, published")
    .eq("slug", businessSlug)
    .maybeSingle();
  if (!business || !business.published) return null;

  const { data: form } = await supabase
    .from("request_forms")
    .select("*")
    .eq("business_id", business.id)
    .eq("slug", formSlug)
    .eq("active", true)
    .maybeSingle();
  if (!form) return null;

  const fields = await getFieldsForForm(form.id);
  return { business, form, fields };
}
