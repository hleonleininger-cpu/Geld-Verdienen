import { z } from "zod";

// Zentrale Zod-Schemas fuer alle serverseitigen Mutationen im Dashboard.
// Browser-seitige `required`/`type="email"`-Attribute auf den Formularen
// sind nur UX – die eigentliche Validierung passiert hier, serverseitig,
// bevor irgendetwas an Supabase geschickt wird.

export const LEAD_STATUSES = [
  "new",
  "in_progress",
  "quote_sent",
  "won",
  "lost",
] as const;

export const leadStatusSchema = z.enum(LEAD_STATUSES);

export const updateLeadStatusSchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
  status: leadStatusSchema,
});

export const reminderSchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
  reminder_at: z
    .string()
    .min(1, "Bitte wähle ein Datum für die Erinnerung.")
    .refine((v) => !Number.isNaN(Date.parse(v)), "Ungültiges Datum."),
});

export const clearReminderSchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
});

export const quoteSchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
  title: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Titel für das Angebot an.")
    .max(200, "Der Titel ist zu lang (max. 200 Zeichen)."),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  price: z
    .number({ invalid_type_error: "Bitte gib einen gültigen Preis an." })
    .min(0, "Der Preis darf nicht negativ sein.")
    .max(1_000_000, "Der Preis ist unrealistisch hoch."),
  valid_until: z.string().optional().or(z.literal("")),
});

const industryKeySchema = z.enum([
  "autopflege",
  "reinigung",
  "gartenservice",
  "fotografie",
  "handwerk",
]);

export const createBusinessSchema = z.object({
  business_name: z
    .string()
    .trim()
    .min(2, "Bitte gib deinen Unternehmensnamen an.")
    .max(120, "Der Name ist zu lang (max. 120 Zeichen)."),
  industry: industryKeySchema,
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Bitte gib eine gültige E-Mail-Adresse an.")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateBusinessProfileSchema = createBusinessSchema.extend({
  business_id: z.string().uuid("Ungültige Unternehmens-ID."),
});
