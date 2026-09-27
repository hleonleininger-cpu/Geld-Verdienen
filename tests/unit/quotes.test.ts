import { describe, expect, it } from "vitest";
import { computeQuoteTotals, getEffectiveQuoteStatus } from "@/lib/quotes";

describe("computeQuoteTotals", () => {
  it("sums quantity × unit_price across line items", () => {
    const totals = computeQuoteTotals(
      [
        { description: "Anfahrt", quantity: 1, unit_price: 50 },
        { description: "Material", quantity: 3, unit_price: 20 },
      ],
      0,
      0
    );
    expect(totals.subtotal).toBe(110);
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(110);
  });

  it("applies a discount before computing tax", () => {
    const totals = computeQuoteTotals(
      [{ description: "Leistung", quantity: 1, unit_price: 200 }],
      50,
      19
    );
    expect(totals.subtotal).toBe(200);
    expect(totals.taxAmount).toBe(28.5); // 19% of (200 - 50)
    expect(totals.total).toBe(178.5);
  });

  it("never lets a discount push the taxable amount below zero", () => {
    const totals = computeQuoteTotals(
      [{ description: "Leistung", quantity: 1, unit_price: 50 }],
      1000,
      19
    );
    expect(totals.taxAmount).toBe(0);
    expect(totals.total).toBe(0);
  });

  it("rounds to 2 decimal places despite floating-point arithmetic", () => {
    const totals = computeQuoteTotals(
      [{ description: "Leistung", quantity: 3, unit_price: 0.1 }],
      0,
      0
    );
    expect(totals.subtotal).toBe(0.3);
  });
});

describe("getEffectiveQuoteStatus", () => {
  it("returns the stored status when there is no valid_until date", () => {
    expect(getEffectiveQuoteStatus("sent", null)).toBe("sent");
  });

  it("returns the stored status when valid_until is in the future", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    expect(getEffectiveQuoteStatus("sent", future)).toBe("sent");
  });

  it("lazily reports 'expired' once valid_until has passed for sent/viewed quotes", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(getEffectiveQuoteStatus("sent", past)).toBe("expired");
    expect(getEffectiveQuoteStatus("viewed", past)).toBe("expired");
  });

  it("never overrides a final status (accepted/declined/draft) even if expired", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    expect(getEffectiveQuoteStatus("accepted", past)).toBe("accepted");
    expect(getEffectiveQuoteStatus("declined", past)).toBe("declined");
    expect(getEffectiveQuoteStatus("draft", past)).toBe("draft");
  });
});
