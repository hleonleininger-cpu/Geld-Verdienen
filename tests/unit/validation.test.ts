import { describe, expect, it } from "vitest";
import {
  updateLeadStatusSchema,
  reminderSchema,
  quoteSchema,
  createBusinessSchema,
  updateBusinessProfileSchema,
} from "@/lib/validation";

const LEAD_ID = "11111111-1111-1111-1111-111111111111";

describe("updateLeadStatusSchema", () => {
  it("accepts a valid status", () => {
    const result = updateLeadStatusSchema.safeParse({ lead_id: LEAD_ID, status: "won" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid status (e.g. a made-up value from a tampered request)", () => {
    const result = updateLeadStatusSchema.safeParse({ lead_id: LEAD_ID, status: "deleted" });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid lead_id", () => {
    const result = updateLeadStatusSchema.safeParse({ lead_id: "abc", status: "won" });
    expect(result.success).toBe(false);
  });
});

describe("reminderSchema", () => {
  it("accepts a valid ISO datetime string", () => {
    const result = reminderSchema.safeParse({
      lead_id: LEAD_ID,
      reminder_at: "2026-12-01T10:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unparsable date", () => {
    const result = reminderSchema.safeParse({ lead_id: LEAD_ID, reminder_at: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("rejects an empty date", () => {
    const result = reminderSchema.safeParse({ lead_id: LEAD_ID, reminder_at: "" });
    expect(result.success).toBe(false);
  });
});

describe("quoteSchema", () => {
  const validLineItems = [{ description: "Badsanierung", quantity: 1, unit_price: 4200 }];

  it("accepts a valid quote", () => {
    const result = quoteSchema.safeParse({
      lead_id: LEAD_ID,
      title: "Badsanierung Komplett",
      description: "",
      line_items: validLineItems,
      discount_amount: 0,
      tax_rate: 19,
      valid_until: "2026-12-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a negative unit price", () => {
    const result = quoteSchema.safeParse({
      lead_id: LEAD_ID,
      title: "Test",
      line_items: [{ description: "Test", quantity: 1, unit_price: -10 }],
      valid_until: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing title", () => {
    const result = quoteSchema.safeParse({
      lead_id: LEAD_ID,
      title: "",
      line_items: validLineItems,
      valid_until: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unrealistically high unit price", () => {
    const result = quoteSchema.safeParse({
      lead_id: LEAD_ID,
      title: "Test",
      line_items: [{ description: "Test", quantity: 1, unit_price: 10_000_000 }],
      valid_until: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty line-items array (at least one position is required)", () => {
    const result = quoteSchema.safeParse({
      lead_id: LEAD_ID,
      title: "Test",
      line_items: [],
      valid_until: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a tax rate above 100%", () => {
    const result = quoteSchema.safeParse({
      lead_id: LEAD_ID,
      title: "Test",
      line_items: validLineItems,
      tax_rate: 150,
      valid_until: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createBusinessSchema", () => {
  it("accepts a valid business", () => {
    const result = createBusinessSchema.safeParse({
      business_name: "Glanzwerk Autopflege",
      industry: "autopflege",
      phone: "",
      email: "",
      description: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unknown industry key (protects against tampered <select> value)", () => {
    const result = createBusinessSchema.safeParse({
      business_name: "Test",
      industry: "space-travel",
      phone: "",
      email: "",
      description: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a too-short business name", () => {
    const result = createBusinessSchema.safeParse({
      business_name: "A",
      industry: "handwerk",
      phone: "",
      email: "",
      description: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateBusinessProfileSchema", () => {
  it("requires a valid business_id in addition to the base fields", () => {
    const result = updateBusinessProfileSchema.safeParse({
      business_id: "not-a-uuid",
      business_name: "Test Betrieb",
      industry: "reinigung",
      phone: "",
      email: "",
      description: "",
    });
    expect(result.success).toBe(false);
  });
});
