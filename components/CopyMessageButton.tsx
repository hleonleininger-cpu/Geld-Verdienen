"use client";

import { useState } from "react";
import { Check, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MessageTemplate } from "@/lib/communication/types";

function templateToText(template: MessageTemplate): string {
  return template.subject ? `${template.subject}\n\n${template.body}` : template.body;
}

export function CopyMessageButton({
  template,
  label = "Nachricht kopieren",
}: {
  template: MessageTemplate;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(templateToText(template));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-API kann in seltenen Kontexten fehlschlagen – dann bleibt
      // der Text einfach zum manuellen Markieren/Kopieren sichtbar.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleCopy} className="no-print">
      {copied ? <Check className="h-4 w-4" /> : <MessageSquareText className="h-4 w-4" />}
      {copied ? "Kopiert!" : label}
    </Button>
  );
}
