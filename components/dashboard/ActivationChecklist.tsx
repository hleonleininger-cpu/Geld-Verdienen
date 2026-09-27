import Link from "next/link";
import { Check } from "lucide-react";
import type { ActivationChecklist } from "@/lib/activation";

export function ActivationChecklistCard({ checklist }: { checklist: ActivationChecklist }) {
  if (checklist.completedCount === checklist.totalCount) return null;

  return (
    <div className="card-surface p-5">
      <div className="flex items-center justify-between">
        <p className="font-medium text-ink-900">Erste Schritte</p>
        <p className="text-sm text-ink-400">
          {checklist.completedCount}/{checklist.totalCount}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-brand-600 transition-all"
          style={{ width: `${checklist.percent}%` }}
        />
      </div>
      <ul className="mt-4 space-y-2">
        {checklist.items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 text-sm hover:bg-ink-50"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                  item.done ? "bg-brand-600 text-white" : "border border-ink-200"
                }`}
              >
                {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className={item.done ? "text-ink-400 line-through" : "text-ink-800"}>
                {item.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
