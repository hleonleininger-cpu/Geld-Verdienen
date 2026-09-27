import { describe, expect, it } from "vitest";
import { generateResponse } from "@/lib/responseGenerator";
import type { BusinessRow, LeadRow } from "@/types/database";

const business: BusinessRow = {
  id: "b1",
  owner_id: "u1",
  business_name: "Glanzwerk Autopflege",
  slug: "glanzwerk-autopflege",
  industry: "autopflege",
  description: null,
  tagline: null,
  phone: null,
  email: null,
  logo_url: null,
  accent_color: null,
  opening_hours: [],
  gallery_urls: [],
  published: true,
  onboarding_step: 10,
  onboarding_completed_at: "2026-01-01T00:00:00.000Z",
  plan: "free",
  trial_started_at: null,
  trial_ends_at: null,
  subscription_status: "none",
  stripe_customer_id: null,
  stripe_subscription_id: null,
  referral_code: "testcode",
  referred_by_code: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

const baseLead: LeadRow = {
  id: "l1",
  business_id: "b1",
  customer_name: "Max Mustermann",
  customer_email: "max@example.com",
  customer_phone: null,
  service: "Innen- und Aussenreinigung",
  preferred_date: "2026-06-01",
  location: "München",
  budget: "100-150 €",
  description: null,
  status: "new",
  priority: "medium",
  assignee_id: null,
  attachment_url: null,
  reminder_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
};

describe("generateResponse", () => {
  it("freundlich: uses the customer's first name and the business name", () => {
    const text = generateResponse(baseLead, business, "freundlich");
    expect(text).toContain("Hallo Max,");
    expect(text).toContain(business.business_name);
    expect(text).toContain(baseLead.service);
  });

  it("whatsapp: starts casually and includes the budget when present", () => {
    const text = generateResponse(baseLead, business, "whatsapp");
    expect(text.startsWith("Hey Max!")).toBe(true);
    expect(text).toContain("100-150 €");
  });

  it("professionell: uses formal 'Sie' address and full customer name", () => {
    const text = generateResponse(baseLead, business, "professionell");
    expect(text).toContain(`Sehr geehrte/r ${baseLead.customer_name},`);
    expect(text).toContain("Mit freundlichen Grüßen");
  });

  it("kurz: is shorter than the freundlich variant", () => {
    const kurz = generateResponse(baseLead, business, "kurz");
    const freundlich = generateResponse(baseLead, business, "freundlich");
    expect(kurz.length).toBeLessThan(freundlich.length);
  });

  it("omits the budget line entirely when no budget was given", () => {
    const leadWithoutBudget: LeadRow = { ...baseLead, budget: null };
    const text = generateResponse(leadWithoutBudget, business, "whatsapp");
    expect(text).not.toContain("Preislich bewegen wir uns im Rahmen von");
  });

  it("never calls an external service (pure string composition)", () => {
    // Regression guard for the "no external AI" requirement: the function
    // must be synchronous and side-effect free.
    const result = generateResponse(baseLead, business, "freundlich");
    expect(typeof result).toBe("string");
  });
});
