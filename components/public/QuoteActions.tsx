"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { acceptQuote, declineQuote, type PublicQuoteActionState } from "@/app/q/[token]/actions";

function AcceptButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="flex-1">
      <Check className="h-4 w-4" />
      {pending ? "Wird übermittelt…" : "Angebot annehmen"}
    </Button>
  );
}

function DeclineButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending} className="flex-1">
      <X className="h-4 w-4" />
      Ablehnen
    </Button>
  );
}

export function QuoteActions({ token }: { token: string }) {
  const initialState: PublicQuoteActionState = null;
  const [acceptState, acceptAction] = useActionState(acceptQuote, initialState);
  const [declineState, declineAction] = useActionState(declineQuote, initialState);
  const [confirmingDecline, setConfirmingDecline] = useState(false);

  const message = acceptState?.message ?? declineState?.message;
  const error = acceptState?.error ?? declineState?.error;

  if (message) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-center text-sm font-medium text-brand-800">
        {message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-center text-sm text-red-600">{error}</p>}
      <div className="flex gap-3">
        <form action={acceptAction} className="flex-1">
          <input type="hidden" name="token" value={token} />
          <AcceptButton />
        </form>
        {confirmingDecline ? (
          <form action={declineAction} className="flex-1">
            <input type="hidden" name="token" value={token} />
            <DeclineButton />
          </form>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1"
            onClick={() => setConfirmingDecline(true)}
          >
            <X className="h-4 w-4" />
            Ablehnen
          </Button>
        )}
      </div>
    </div>
  );
}
