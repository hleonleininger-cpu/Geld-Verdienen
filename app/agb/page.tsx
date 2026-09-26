import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Allgemeine Geschäftsbedingungen",
  description: "Nutzungsbedingungen für AnfragePilot.",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink-100 py-6 first:border-t-0 first:pt-0">
      <h2 className="font-display text-lg font-semibold text-ink-950">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-ink-600">{children}</div>
    </section>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-amber-800">
      {children}
    </p>
  );
}

export default function AGBPage() {
  return (
    <>
      <MarketingNavbar />
      <main className="section-pad">
        <div className="container-app max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
            Allgemeine Geschäftsbedingungen (AGB)
          </h1>

          <div className="mt-6 rounded-xl2 border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <strong>Hinweis:</strong> Diese Seite ist ein technisches Gerüst mit
            typischen AGB-Abschnitten für ein SaaS-Produkt. Sie ersetzt keine
            Rechtsberatung. Bitte die Inhalte vor dem produktiven Betrieb von
            einer Rechtsberatung prüfen und ausfüllen lassen.
          </div>

          <div className="mt-4">
            <Section title="1. Geltungsbereich">
              <Placeholder>
                [Platzhalter: Vertragspartner, Anwendungsbereich der AGB.]
              </Placeholder>
            </Section>

            <Section title="2. Leistungsbeschreibung">
              <p>
                AnfragePilot stellt Unternehmer:innen ein Dashboard zur
                Verwaltung eingehender Kundenanfragen sowie eine öffentliche
                Anfrageseite pro Unternehmen zur Verfügung.
              </p>
              <Placeholder>
                [Platzhalter: Details zum Leistungsumfang je Preisplan, Verfügbarkeit
                (SLA), geplante Wartungsfenster.]
              </Placeholder>
            </Section>

            <Section title="3. Preise und Zahlung">
              <p>
                Die auf der Preis-Seite dargestellten Tarife sind aktuell eine
                Vorschau ohne aktive Zahlungsabwicklung.
              </p>
              <Placeholder>
                [Platzhalter: Sobald eine echte Zahlungsintegration aktiv ist,
                Zahlungsmodalitäten, Laufzeiten und Kündigungsfristen ergänzen.]
              </Placeholder>
            </Section>

            <Section title="4. Pflichten der Nutzer:innen">
              <Placeholder>
                [Platzhalter: Pflicht zur wahrheitsgemäßen Angabe von
                Unternehmensdaten, Verantwortung für eingegebene Kundendaten,
                Verbot missbräuchlicher Nutzung.]
              </Placeholder>
            </Section>

            <Section title="5. Kündigung und Kontolöschung">
              <p>
                Nutzer:innen können ihr Unternehmen oder ihr gesamtes Konto
                jederzeit selbstständig im Dashboard unter „Profil“ löschen.
              </p>
              <Placeholder>
                [Platzhalter: Kündigungsfristen für kostenpflichtige Tarife, sobald
                diese aktiv sind.]
              </Placeholder>
            </Section>

            <Section title="6. Haftung">
              <Placeholder>
                [Platzhalter: Haftungsbeschränkungen im rechtlich zulässigen Rahmen.]
              </Placeholder>
            </Section>

            <Section title="7. Schlussbestimmungen">
              <Placeholder>
                [Platzhalter: Anwendbares Recht, Gerichtsstand, Salvatorische Klausel.]
              </Placeholder>
            </Section>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
