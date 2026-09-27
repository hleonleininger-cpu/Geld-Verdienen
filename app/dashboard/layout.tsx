import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentBusiness } from "@/lib/data/business";
import { getUnreadNotificationCount } from "@/lib/data/notifications";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { MobileTopBar } from "@/components/dashboard/MobileTopBar";

// Gilt fuer den gesamten /dashboard/*-Baum: private Kundendaten duerfen
// nicht in Suchmaschinen landen.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const business = await getCurrentBusiness();

  // Kein Business oder Onboarding nicht abgeschlossen -> Wizard statt
  // Dashboard (siehe app/onboarding). Idempotent: der Wizard erkennt
  // selbst, an welchem Schritt fortgesetzt werden muss.
  if (!business || !business.onboarding_completed_at) {
    redirect("/onboarding");
  }

  const unreadCount = await getUnreadNotificationCount(business.id);

  return (
    <div className="min-h-screen bg-sand-50 md:flex">
      <div className="hidden md:block md:w-64 md:shrink-0">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar slug={business.slug} unreadCount={unreadCount} />
        </div>
      </div>
      <div className="flex-1 pb-16 md:pb-0">
        <MobileTopBar unreadCount={unreadCount} />
        <main className="container-app py-6 sm:py-10">{children}</main>
        <MobileTabBar />
      </div>
    </div>
  );
}
