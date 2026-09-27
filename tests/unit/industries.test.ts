import { describe, expect, it } from "vitest";
import { getIndustry, findRecommendation, INDUSTRIES, INDUSTRY_LIST } from "@/lib/industries";

describe("getIndustry", () => {
  it("returns the matching industry for a known key", () => {
    expect(getIndustry("autopflege").label).toBe("Autopflege");
  });

  it("falls back to 'handwerk' for an unknown/missing key", () => {
    expect(getIndustry("unknown-industry").key).toBe("handwerk");
    expect(getIndustry(null).key).toBe("handwerk");
    expect(getIndustry(undefined).key).toBe("handwerk");
  });
});

describe("findRecommendation", () => {
  it("matches a keyword in the service/description text", () => {
    const rec = findRecommendation(INDUSTRIES.autopflege, "Lackversiegelung gewünscht");
    expect(rec).toContain("Versiegelung");
  });

  it("is case-insensitive", () => {
    const rec = findRecommendation(INDUSTRIES.gartenservice, "HECKENSCHNITT bitte");
    expect(rec).toContain("Heckenschnitt");
  });

  it("falls back to the industry default when nothing matches", () => {
    const rec = findRecommendation(INDUSTRIES.fotografie, "irgendetwas ganz anderes");
    expect(rec).toBe(INDUSTRIES.fotografie.defaultRecommendation);
  });
});

describe("branch-specific templates (section 2: 5 industries, data-driven)", () => {
  it("covers at least the 5 required industries", () => {
    expect(INDUSTRY_LIST.length).toBeGreaterThanOrEqual(5);
    const keys = INDUSTRY_LIST.map((i) => i.key);
    expect(keys).toEqual(
      expect.arrayContaining(["autopflege", "reinigung", "gartenservice", "fotografie", "handwerk"])
    );
  });

  it.each(INDUSTRY_LIST)(
    "$label has a complete, non-empty template (profile, services, form fields, FAQ, quote)",
    (industry) => {
      expect(industry.tagline.length).toBeGreaterThan(0);
      expect(industry.description.length).toBeGreaterThan(0);
      expect(industry.services.length).toBeGreaterThan(0);
      expect(industry.formFields.length).toBeGreaterThan(0);
      expect(industry.faq.length).toBeGreaterThan(0);
      expect(industry.quoteSuggestion.lineItems.length).toBeGreaterThan(0);
    }
  );

  it("derives exampleServices names from the same services template (no duplicated data)", () => {
    for (const industry of INDUSTRY_LIST) {
      for (const name of industry.exampleServices) {
        expect(industry.services.some((s) => s.name === name)).toBe(true);
      }
    }
  });

  it("only uses select/multiselect form field types with at least one option", () => {
    for (const industry of INDUSTRY_LIST) {
      for (const field of industry.formFields) {
        if (field.field_type === "select" || field.field_type === "multiselect") {
          expect(field.options?.length ?? 0).toBeGreaterThan(0);
        }
      }
    }
  });
});
