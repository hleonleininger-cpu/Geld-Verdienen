"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, Trash2 } from "lucide-react";
import { Label, Input, Textarea } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { formatCurrencyEUR } from "@/lib/format";
import { computeQuoteTotals, emptyLineItem } from "@/lib/quotes";
import { createQuote, type LeadActionState } from "@/app/dashboard/leads/actions";
import type { QuoteLineItem } from "@/types/database";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Wird gespeichert…" : "Als Entwurf speichern"}
    </Button>
  );
}

export function QuoteForm({
  leadId,
  defaultTitle,
  defaultPrice,
}: {
  leadId: string;
  defaultTitle: string;
  defaultPrice: number;
}) {
  const initialState: LeadActionState = null;
  const [state, formAction] = useActionState(createQuote, initialState);

  const [lineItems, setLineItems] = useState<QuoteLineItem[]>([
    { description: defaultTitle, quantity: 1, unit_price: defaultPrice },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);

  const inFourWeeks = new Date();
  inFourWeeks.setDate(inFourWeeks.getDate() + 28);
  const defaultValidUntil = inFourWeeks.toISOString().slice(0, 10);

  const totals = useMemo(
    () => computeQuoteTotals(lineItems, discountAmount, taxRate),
    [lineItems, discountAmount, taxRate]
  );

  function updateItem(index: number, patch: Partial<QuoteLineItem>) {
    setLineItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  }

  function addItem() {
    setLineItems((items) => [...items, emptyLineItem()]);
  }

  function removeItem(index: number) {
    setLineItems((items) => (items.length > 1 ? items.filter((_, i) => i !== index) : items));
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="line_items" value={JSON.stringify(lineItems)} />
      <input type="hidden" name="discount_amount" value={discountAmount} />
      <input type="hidden" name="tax_rate" value={taxRate} />

      <div>
        <Label htmlFor="title">Titel</Label>
        <Input id="title" name="title" required defaultValue={defaultTitle} />
      </div>
      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={2}
          placeholder="Was ist im Angebot enthalten?"
        />
      </div>

      <div className="space-y-2">
        <Label>Positionen</Label>
        {lineItems.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <Input
              aria-label="Bezeichnung"
              placeholder="Bezeichnung"
              value={item.description}
              onChange={(e) => updateItem(index, { description: e.target.value })}
              className="flex-1"
            />
            <Input
              aria-label="Menge"
              type="number"
              min="0.01"
              step="0.01"
              value={item.quantity}
              onChange={(e) => updateItem(index, { quantity: Number(e.target.value) || 0 })}
              className="w-20"
            />
            <Input
              aria-label="Einzelpreis"
              type="number"
              min="0"
              step="0.01"
              value={item.unit_price}
              onChange={(e) => updateItem(index, { unit_price: Number(e.target.value) || 0 })}
              className="w-28"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={lineItems.length <= 1}
              className="mt-2.5 text-ink-400 hover:text-red-600 disabled:opacity-30"
              aria-label="Position entfernen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <Plus className="h-3.5 w-3.5" />
          Position hinzufügen
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="discount_amount" optional>
            Rabatt (€)
          </Label>
          <Input
            id="discount_amount"
            type="number"
            min="0"
            step="0.01"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="tax_rate" optional>
            MwSt. (%)
          </Label>
          <Input
            id="tax_rate"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={taxRate}
            onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
          />
        </div>
        <div>
          <Label htmlFor="valid_until" optional>
            Gültig bis
          </Label>
          <Input id="valid_until" name="valid_until" type="date" defaultValue={defaultValidUntil} />
        </div>
      </div>

      <div className="rounded-lg bg-sand-50 px-4 py-3 text-sm">
        <div className="flex justify-between text-ink-500">
          <span>Zwischensumme</span>
          <span>{formatCurrencyEUR(totals.subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-ink-500">
            <span>Rabatt</span>
            <span>-{formatCurrencyEUR(discountAmount)}</span>
          </div>
        )}
        {taxRate > 0 && (
          <div className="flex justify-between text-ink-500">
            <span>MwSt. ({taxRate}%)</span>
            <span>{formatCurrencyEUR(totals.taxAmount)}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t border-ink-100 pt-1 font-semibold text-ink-950">
          <span>Gesamt</span>
          <span>{formatCurrencyEUR(totals.total)}</span>
        </div>
      </div>

      <div>
        <Label htmlFor="notes" optional>
          Notizen (für den Kunden sichtbar)
        </Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>
      <div>
        <Label htmlFor="terms" optional>
          Bedingungen
        </Label>
        <Textarea id="terms" name="terms" rows={2} placeholder="z. B. Zahlungsziel, Gültigkeit" />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
