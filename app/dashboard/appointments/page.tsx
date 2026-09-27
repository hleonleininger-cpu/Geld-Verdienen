import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getCurrentBusiness } from "@/lib/data/business";
import { getAppointmentsForBusiness, getBlockedTimesForBusiness } from "@/lib/data/appointments";
import { hasFeature } from "@/lib/entitlements";
import { UpgradeBanner } from "@/components/dashboard/UpgradeBanner";
import { Badge } from "@/components/ui/Card";
import { AppointmentSettingsForm } from "@/components/dashboard/appointments/AppointmentSettingsForm";
import { AddBlockedTimeForm } from "@/components/dashboard/appointments/AddBlockedTimeForm";
import { BlockedTimesList } from "@/components/dashboard/appointments/BlockedTimesList";
import { AppointmentStatusForm } from "@/components/dashboard/appointments/AppointmentStatusForm";
import { formatDateTimeDe, APPOINTMENT_STATUS_LABELS, APPOINTMENT_STATUS_BADGE_CLASSES } from "@/lib/format";

export const metadata: Metadata = { title: "Termine" };

export default async function AppointmentsPage() {
  const business = await getCurrentBusiness();
  if (!business) return null;

  const canUseCalendar = hasFeature(business, "calendar");
  const [appointments, blockedTimes] = await Promise.all([
    getAppointmentsForBusiness(business.id),
    getBlockedTimesForBusiness(business.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-950">Termine</h1>
        <p className="mt-1 text-sm text-ink-500">
          Kunden buchen einen Termin, nachdem sie ein Angebot angenommen haben. Öffnungszeiten
          legst du im Profil fest.
        </p>
      </div>

      {!canUseCalendar && (
        <UpgradeBanner
          title="Terminbuchung ist Teil des Pro-Plans"
          description="Lass Kunden nach Angebotsannahme direkt einen freien Termin auswählen."
        />
      )}

      {canUseCalendar && (
        <>
          <AppointmentSettingsForm
            durationMinutes={business.appointment_duration_minutes}
            bufferMinutes={business.appointment_buffer_minutes}
          />

          <div className="card-surface space-y-4 p-5">
            <h2 className="font-display text-base font-semibold text-ink-950">
              Blockierte Zeiten
            </h2>
            <AddBlockedTimeForm />
            <BlockedTimesList blockedTimes={blockedTimes} />
          </div>

          <div className="card-surface p-5">
            <h2 className="font-display text-base font-semibold text-ink-950">
              Anstehende Termine
            </h2>
            {appointments.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-2 py-8 text-center">
                <CalendarClock className="h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-500">Noch keine gebuchten Termine.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-ink-100 px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-ink-900">
                          {formatDateTimeDe(appointment.scheduled_at)} Uhr
                        </p>
                        <Badge className={APPOINTMENT_STATUS_BADGE_CLASSES[appointment.status]}>
                          {APPOINTMENT_STATUS_LABELS[appointment.status]}
                        </Badge>
                      </div>
                      <Link
                        href={`/dashboard/leads/${appointment.lead_id}`}
                        className="truncate text-xs text-ink-500 hover:underline"
                      >
                        {appointment.lead?.customer_name ?? "Anfrage ansehen"}
                      </Link>
                    </div>
                    <AppointmentStatusForm
                      appointmentId={appointment.id}
                      status={appointment.status}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
