import type { QuoteLineItem, QuoteStatus } from "@/types/database";

export interface QuoteTotals {
  subtotal: number;
  taxAmount: number;
  total: number;
}

/** Rundet auf 2 Nachkommastellen, um Floating-Point-Reste zu vermeiden. */
function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeQuoteTotals(
  lineItems: QuoteLineItem[],
  discountAmount: number,
  taxRatePercent: number
): QuoteTotals {
  const subtotal = round2(
    lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  );
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const taxAmount = round2(afterDiscount * (taxRatePercent / 100));
  const total = round2(afterDiscount + taxAmount);

  return { subtotal, taxAmount, total };
}

/**
 * Lazy-Ablauf (siehe supabase/schema.sql-Kommentar): ein Angebot mit
 * abgelaufenem `valid_until` gilt als "expired", auch wenn der
 * gespeicherte Status noch "sent"/"viewed" ist – ohne dass dafuer ein
 * Cron-Job den Datensatz aendern muss.
 */
export function getEffectiveQuoteStatus(
  status: QuoteStatus,
  validUntil: string | null
): QuoteStatus {
  if (
    (status === "sent" || status === "viewed") &&
    validUntil &&
    new Date(validUntil).getTime() < Date.now()
  ) {
    return "expired";
  }
  return status;
}

export function emptyLineItem(): QuoteLineItem {
  return { description: "", quantity: 1, unit_price: 0 };
}
