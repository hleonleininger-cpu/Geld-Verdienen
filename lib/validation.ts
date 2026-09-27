import { z } from "zod";

// Zentrale Zod-Schemas fuer alle serverseitigen Mutationen im Dashboard.
// Browser-seitige `required`/`type="email"`-Attribute auf den Formularen
// sind nur UX – die eigentliche Validierung passiert hier, serverseitig,
// bevor irgendetwas an Supabase geschickt wird.

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "qualified",
  "quote_sent",
  "negotiating",
  "won",
  "lost",
] as const;

export const LEAD_PRIORITIES = ["low", "medium", "high"] as const;

export const leadStatusSchema = z.enum(LEAD_STATUSES);
export const leadPrioritySchema = z.enum(LEAD_PRIORITIES);

export const updateLeadStatusSchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
  status: leadStatusSchema,
});

export const updateLeadPrioritySchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
  priority: leadPrioritySchema,
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

export const lineItemSchema = z.object({
  description: z.string().trim().min(1, "Bitte gib eine Bezeichnung an.").max(200),
  quantity: z.number().min(0.01, "Menge muss größer als 0 sein.").max(100_000),
  unit_price: z.number().min(0, "Der Preis darf nicht negativ sein.").max(1_000_000),
});

export const quoteSchema = z.object({
  lead_id: z.string().uuid("Ungültige Anfrage-ID."),
  title: z
    .string()
    .trim()
    .min(1, "Bitte gib einen Titel für das Angebot an.")
    .max(200, "Der Titel ist zu lang (max. 200 Zeichen)."),
  description: z.string().trim().max(4000).optional().or(z.literal("")),
  line_items: z.array(lineItemSchema).min(1, "Bitte füge mindestens eine Position hinzu."),
  discount_amount: z.number().min(0).max(1_000_000).default(0),
  tax_rate: z.number().min(0).max(100).default(0),
  valid_until: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  terms: z.string().trim().max(4000).optional().or(z.literal("")),
});

export const industryKeySchema = z.enum([
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
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
  accent_color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Bitte gib eine gültige Hex-Farbe an (z. B. #1c9166).")
    .optional()
    .or(z.literal("")),
});

const openingHoursDaySchema = z.object({
  day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  open: z.string().regex(/^\d{2}:\d{2}$/),
  close: z.string().regex(/^\d{2}:\d{2}$/),
  closed: z.boolean(),
});

export const openingHoursSchema = z.array(openingHoursDaySchema).max(7);

export const serviceSchema = z.object({
  name: z.string().trim().min(1, "Bitte gib einen Namen an.").max(120),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  price: z.number().min(0).max(1_000_000).nullable().optional(),
  duration_minutes: z.number().int().min(1).max(10_000).nullable().optional(),
  active: z.boolean().default(true),
});

export const updateServiceSchema = serviceSchema.extend({
  service_id: z.string().uuid("Ungültige Leistungs-ID."),
});

// Onboarding-Schritte (siehe lib/onboarding.ts fuer die Schrittdefinition)
export const onboardingStep1Schema = z.object({
  business_name: z.string().trim().min(2, "Bitte gib deinen Unternehmensnamen an.").max(120),
});

export const onboardingStep2Schema = z.object({
  industry: industryKeySchema,
});

export const onboardingStep3Schema = z.object({
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  tagline: z.string().trim().max(160).optional().or(z.literal("")),
});

export const onboardingStep6Schema = z.object({
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Bitte gib eine gültige E-Mail-Adresse an.")
    .optional()
    .or(z.literal("")),
});
