import type { BusinessPlan } from "@/types/database";

const PLAN_LABELS: Record<BusinessPlan, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
};

const PLAN_CLASSES: Record<BusinessPlan, string> = {
  free: "bg-ink-100 text-ink-600",
  starter: "bg-sky-100 text-sky-700",
  pro: "bg-brand-600 text-white",
  business: "bg-ink-950 text-white",
};

export function PlanBadge({ plan, isTrialing }: { plan: BusinessPlan; isTrialing?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${PLAN_CLASSES[plan]}`}
    >
      {PLAN_LABELS[plan]}
      {isTrialing && " · Test"}
    </span>
  );
}
