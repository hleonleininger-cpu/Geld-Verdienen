"use client";

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function CopyLinkButton({ url, label = "Link kopieren" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-API kann in seltenen Kontexten (kein sicherer Kontext,
      // fehlende Berechtigung) fehlschlagen – dann bleibt der Link einfach
      // sichtbar zum manuellen Kopieren, kein Absturz noetig.
    }
  }

  return (
    <Button type="button" variant="outline" onClick={handleCopy} className="no-print">
      {copied ? <Check className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
      {copied ? "Kopiert!" : label}
    </Button>
  );
}
