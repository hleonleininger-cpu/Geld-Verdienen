import { z } from "zod";

export const leadFormSchema = z.object({
  business_id: z.string().uuid(),
  customer_name: z.string().trim().min(2, "Bitte gib deinen Namen an.").max(120),
  customer_email: z.string().trim().email("Bitte gib eine gültige E-Mail-Adresse an."),
  customer_phone: z.string().trim().max(40).optional().or(z.literal("")),
  service: z.string().trim().min(2, "Bitte gib die gewünschte Leistung an.").max(160),
  preferred_date: z.string().optional().or(z.literal("")),
  location: z.string().trim().max(160).optional().or(z.literal("")),
  budget: z.string().trim().max(80).optional().or(z.literal("")),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;
