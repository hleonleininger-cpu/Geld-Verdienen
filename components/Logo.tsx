import { cn } from "@/lib/cn";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-display text-lg font-semibold text-ink-950",
        className
      )}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-950 text-[13px] font-bold text-brand-300">
        AP
      </span>
      AnfragePilot
    </span>
  );
}
