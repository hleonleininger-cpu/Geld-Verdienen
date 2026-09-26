import { describe, expect, it } from "vitest";
import { leadFormSchema } from "@/lib/leadSchema";

const validBase = {
  business_id: "11111111-1111-1111-1111-111111111111",
  customer_name: "Max Mustermann",
  customer_email: "max@example.com",
  customer_phone: "",
  service: "Innenreinigung",
  preferred_date: "",
  location: "",
  budget: "",
  description: "",
};

describe("leadFormSchema", () => {
  it("accepts a minimal valid submission", () => {
    const result = leadFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("rejects a non-uuid business_id (protects against malformed/spoofed IDs)", () => {
    const result = leadFormSchema.safeParse({ ...validBase, business_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing customer name", () => {
    const result = leadFormSchema.safeParse({ ...validBase, customer_name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = leadFormSchema.safeParse({ ...validBase, customer_email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects an overly long description (DB has a 2000 char check constraint)", () => {
    const result = leadFormSchema.safeParse({
      ...validBase,
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields left empty", () => {
    const result = leadFormSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });
});
