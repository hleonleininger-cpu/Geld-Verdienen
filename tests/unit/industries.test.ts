import { describe, expect, it } from "vitest";
import { getIndustry, findRecommendation, INDUSTRIES } from "@/lib/industries";

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
