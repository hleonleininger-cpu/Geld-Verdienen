import type { Metadata } from "next";
import { getCurrentBusiness } from "@/lib/data/business";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { MobileTabBar } from "@/components/dashboard/MobileTabBar";
import { MobileTopBar } from "@/components/dashboard/MobileTopBar";
import { CreateBusinessForm } from "@/components/dashboard/CreateBusinessForm";

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

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-5 py-12">
        <CreateBusinessForm />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-50 md:flex">
      <div className="hidden md:block md:w-64 md:shrink-0">
        <div className="fixed inset-y-0 left-0 w-64">
          <Sidebar slug={business.slug} />
        </div>
      </div>
      <div className="flex-1 pb-16 md:pb-0">
        <MobileTopBar />
        <main className="container-app py-6 sm:py-10">{children}</main>
        <MobileTabBar slug={business.slug} />
      </div>
    </div>
  );
}
