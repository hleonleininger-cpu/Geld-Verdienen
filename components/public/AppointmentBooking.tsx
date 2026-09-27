"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatDateDe, formatTimeDe } from "@/lib/format";
import { bookAppointment, type PublicQuoteActionState } from "@/app/q/[token]/actions";

function SlotButton({ startsAt }: { startsAt: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-ink-100 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
    >
      {formatTimeDe(startsAt)}
    </button>
  );
}

export function AppointmentBooking({
  token,
  date,
  minDate,
  prevDate,
  nextDate,
  slots,
}: {
  token: string;
  date: string;
  minDate: string;
  prevDate: string;
  nextDate: string;
  slots: string[];
}) {
  const initialState: PublicQuoteActionState = null;
  const [state, action] = useActionState(bookAppointment, initialState);

  if (state?.message) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 px-5 py-4 text-center text-sm font-medium text-brand-800">
        {state.message}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-sand-50 p-5">
      <p className="text-center font-display text-base font-semibold text-ink-950">
        Termin auswählen
      </p>
      {state?.error && (
        <p className="mt-2 text-center text-sm text-red-600">{state.error}</p>
      )}

      <div className="mt-4 flex items-center justify-between">
        {prevDate >= minDate ? (
          <Link
            href={`?date=${prevDate}`}
            scroll={false}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-100 text-ink-500 hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
        ) : (
          <span className="h-9 w-9" />
        )}
        <p className="text-sm font-medium text-ink-900">{formatDateDe(date)}</p>
        <Link
          href={`?date=${nextDate}`}
          scroll={false}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-100 text-ink-500 hover:bg-white"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {slots.length === 0 ? (
        <p className="mt-4 flex items-center justify-center gap-2 text-center text-sm text-ink-500">
          <Clock className="h-4 w-4" />
          An diesem Tag sind leider keine Termine mehr frei.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {slots.map((slot) => (
            <form key={slot} action={action}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="starts_at" value={slot} />
              <SlotButton startsAt={slot} />
            </form>
          ))}
        </div>
      )}
    </div>
  );
}
