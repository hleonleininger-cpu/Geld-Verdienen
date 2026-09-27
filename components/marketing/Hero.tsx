import { ButtonLink } from "@/components/ui/Button";
import { DashboardPreview } from "@/components/marketing/DashboardPreview";

export function Hero() {
  return (
    <section className="section-pad pt-14 sm:pt-20">
      <div className="container-app grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div className="animate-fade-up">
          <p className="eyebrow">Für lokale Dienstleister</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink-950 sm:text-5xl lg:text-[3.4rem]">
            Keine Kundenanfrage mehr verlieren.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-600">
            AnfragePilot sammelt Anfragen, hilft dir schneller zu antworten,
            erstellt Angebote, holt dir die Zusage deiner Kunden – und lässt sie
            direkt einen Termin buchen.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/register" size="lg">
              Kostenlos starten
            </ButtonLink>
            <ButtonLink href="/demo" variant="outline" size="lg">
              Demo ansehen
            </ButtonLink>
          </div>
          <p className="mt-6 text-sm text-ink-400">
            Kein Setup-Aufwand · Kostenlos starten · Jederzeit kündbar
          </p>
        </div>
        <div className="animate-fade-in [animation-delay:150ms]">
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}
