import type { Metadata } from "next";
import { Wrench } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getServicesForBusiness } from "@/lib/data/services";
import { ServiceCard } from "@/components/dashboard/services/ServiceCard";
import { CreateServiceForm } from "@/components/dashboard/services/CreateServiceForm";

export const metadata: Metadata = { title: "Leistungen" };

export default async function ServicesPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const services = await getServicesForBusiness(business.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-950">Leistungen</h1>
          <p className="mt-1 text-sm text-ink-500">
            Werden auf deiner öffentlichen Anfrageseite gezeigt und im Angebotsgenerator
            vorgeschlagen.
          </p>
        </div>
        <CreateServiceForm />
      </div>

      {services.length === 0 ? (
        <div className="card-surface flex flex-col items-center gap-3 p-10 text-center">
          <Wrench className="h-8 w-8 text-ink-300" />
          <p className="text-sm text-ink-500">Füge deine erste Dienstleistung hinzu.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
