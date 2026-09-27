import { describe, expect, it } from "vitest";
import { getEffectivePlanInfo, hasFeature, PLAN_FEATURES, TRIAL_PLAN } from "@/lib/entitlements";
import type { BusinessPlan, SubscriptionStatus } from "@/types/database";

function business(overrides: {
  plan?: BusinessPlan;
  subscription_status?: SubscriptionStatus;
  trial_ends_at?: string | null;
}) {
  return {
    plan: overrides.plan ?? "free",
    subscription_status: overrides.subscription_status ?? "none",
    trial_ends_at: overrides.trial_ends_at ?? null,
  };
}

describe("getEffectivePlanInfo — trial logic", () => {
  it("grants the trial plan while trialing with a future trial_ends_at", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const info = getEffectivePlanInfo(
      business({ plan: "free", subscription_status: "trialing", trial_ends_at: future })
    );
    expect(info.plan).toBe(TRIAL_PLAN);
    expect(info.isTrialing).toBe(true);
    expect(info.trialExpired).toBe(false);
    expect(info.trialDaysLeft).toBeGreaterThan(0);
  });

  it("falls back to the free plan once the trial has expired — never deletes data, only degrades features", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const info = getEffectivePlanInfo(
      business({ plan: "free", subscription_status: "trialing", trial_ends_at: past })
    );
    expect(info.plan).toBe("free");
    expect(info.isTrialing).toBe(false);
    expect(info.trialExpired).toBe(true);
    expect(info.trialDaysLeft).toBeNull();
  });

  it("uses the booked plan when the subscription is active, regardless of trial_ends_at", () => {
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const info = getEffectivePlanInfo(
      business({ plan: "business", subscription_status: "active", trial_ends_at: past })
    );
    expect(info.plan).toBe("business");
    expect(info.isTrialing).toBe(false);
  });

  it("falls back to free for a canceled or past_due subscription", () => {
    expect(
      getEffectivePlanInfo(business({ plan: "pro", subscription_status: "canceled" })).plan
    ).toBe("free");
    expect(
      getEffectivePlanInfo(business({ plan: "pro", subscription_status: "past_due" })).plan
    ).toBe("free");
  });
});

describe("hasFeature — plan gating", () => {
  it("gates custom_branding off for the free plan", () => {
    expect(hasFeature(business({ plan: "free" }), "custom_branding")).toBe(false);
  });

  it("grants custom_branding for starter, pro, and business once the subscription is active", () => {
    expect(
      hasFeature(business({ plan: "starter", subscription_status: "active" }), "custom_branding")
    ).toBe(true);
    expect(
      hasFeature(business({ plan: "pro", subscription_status: "active" }), "custom_branding")
    ).toBe(true);
    expect(
      hasFeature(business({ plan: "business", subscription_status: "active" }), "custom_branding")
    ).toBe(true);
  });

  it("does NOT grant a paid plan's features while the subscription is not active (e.g. a stale 'plan' column with subscription_status='none')", () => {
    expect(
      hasFeature(business({ plan: "business", subscription_status: "none" }), "custom_branding")
    ).toBe(false);
  });

  it("grants pro-plan features (advanced_analytics) during an active trial", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const info = business({ plan: "free", subscription_status: "trialing", trial_ends_at: future });
    expect(hasFeature(info, "advanced_analytics")).toBe(true);
  });

  it("every plan defines max_leads_per_month as either a positive number or unlimited (null)", () => {
    for (const plan of Object.values(PLAN_FEATURES)) {
      expect(plan.max_leads_per_month === null || plan.max_leads_per_month > 0).toBe(true);
    }
  });
});
