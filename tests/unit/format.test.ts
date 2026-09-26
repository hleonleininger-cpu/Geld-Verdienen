import { describe, expect, it } from "vitest";
import { parseBudget, slugify, formatCurrencyEUR, STATUS_LABELS } from "@/lib/format";

describe("parseBudget", () => {
  it("returns 0 for empty/undefined input", () => {
    expect(parseBudget(null)).toBe(0);
    expect(parseBudget(undefined)).toBe(0);
    expect(parseBudget("")).toBe(0);
  });

  it("returns 0 when no numbers are present", () => {
    expect(parseBudget("nach Vereinbarung")).toBe(0);
  });

  it("parses a single number", () => {
    expect(parseBudget("150 €")).toBe(150);
  });

  it("averages a range like '100-150 €'", () => {
    expect(parseBudget("100-150 €")).toBe(125);
  });

  it("handles German decimal comma", () => {
    expect(parseBudget("99,50 €")).toBeCloseTo(99.5);
  });
});

describe("slugify", () => {
  it("lowercases and replaces German umlauts", () => {
    expect(slugify("Glänzwerk Autopflege")).toBe("glaenzwerk-autopflege");
  });

  it("replaces ß with ss", () => {
    expect(slugify("Straße")).toBe("strasse");
  });

  it("collapses non-alphanumeric runs into single hyphens", () => {
    expect(slugify("Café & Co.  GmbH!!")).toBe("cafe-co-gmbh");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--Test--")).toBe("test");
  });

  it("caps length at 60 characters", () => {
    const long = "a".repeat(100);
    expect(slugify(long).length).toBeLessThanOrEqual(60);
  });
});

describe("formatCurrencyEUR", () => {
  it("formats a number as German EUR currency", () => {
    // Non-breaking space between number and € in de-DE Intl output.
    expect(formatCurrencyEUR(1234.5).replace(/ /g, " ")).toBe("1.234,50 €");
  });

  it("returns a dash for null/undefined", () => {
    expect(formatCurrencyEUR(null)).toBe("-");
    expect(formatCurrencyEUR(undefined)).toBe("-");
  });
});

describe("STATUS_LABELS", () => {
  it("has a German label for every lead status", () => {
    expect(STATUS_LABELS.new).toBe("Neu");
    expect(STATUS_LABELS.won).toBe("Gewonnen");
    expect(STATUS_LABELS.lost).toBe("Verloren");
  });
});
