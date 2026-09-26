"use client";

import { useState } from "react";
import { Copy, Check, Sparkles } from "lucide-react";
import { Select, Textarea, Label } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { generateResponse, TONE_OPTIONS, type ResponseTone } from "@/lib/responseGenerator";
import type { BusinessRow, LeadRow } from "@/types/database";

export function ResponseGenerator({
  lead,
  business,
}: {
  lead: LeadRow;
  business: BusinessRow;
}) {
  const [tone, setTone] = useState<ResponseTone>("freundlich");
  const [text, setText] = useState(() => generateResponse(lead, business, "freundlich"));
  const [copied, setCopied] = useState(false);

  function regenerate(nextTone: ResponseTone = tone) {
    setText(generateResponse(lead, business, nextTone));
    setCopied(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-Zugriff kann in manchen Kontexten fehlschlagen – dann bleibt
      // der Text einfach markierbar/kopierbar per Hand.
    }
  }

  return (
    <div id="antwort" className="card-surface p-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-brand-600" />
        <h2 className="font-display text-lg font-semibold text-ink-950">Antwort erstellen</h2>
      </div>
      <p className="mt-1 text-sm text-ink-500">
        Automatisch aus Textbausteinen erstellt – editiere die Nachricht nach Bedarf.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-48">
          <Label htmlFor="tone">Ton</Label>
          <Select
            id="tone"
            value={tone}
            onChange={(e) => {
              const next = e.target.value as ResponseTone;
              setTone(next);
            }}
          >
            {TONE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <Button type="button" variant="outline" onClick={() => regenerate(tone)}>
          Text generieren
        </Button>
      </div>

      <div className="mt-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          className="font-sans"
        />
      </div>

      <div className="mt-3 flex justify-end">
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Kopiert!" : "Kopieren"}
        </Button>
      </div>
    </div>
  );
}
