import { hasFeature, type PlanFeatures } from "@/lib/entitlements";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import type { BusinessRow } from "@/types/database";

/**
 * Zentrale Stelle, um ein Feature hinter den Plan zu gaten (Phase 11/20):
 * rendert `children`, wenn `business` das Feature hat, sonst einen
 * `UpgradeBanner`. Ersetzt verstreute `if (business.plan === ...)`-Checks
 * in einzelnen Komponenten.
 */
export function FeatureGate({
  business,
  feature,
  fallbackTitle,
  fallbackDescription,
  children,
}: {
  business: Pick<BusinessRow, "plan" | "subscription_status" | "trial_ends_at">;
  feature: keyof PlanFeatures;
  fallbackTitle?: string;
  fallbackDescription?: string;
  children: React.ReactNode;
}) {
  if (hasFeature(business, feature)) {
    return <>{children}</>;
  }
  return <UpgradeBanner title={fallbackTitle} description={fallbackDescription} />;
}
