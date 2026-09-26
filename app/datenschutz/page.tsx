import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/marketing/Navbar";
import { MarketingFooter } from "@/components/marketing/Footer";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen zur Verarbeitung personenbezogener Daten bei AnfragePilot.",
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

export default function DatenschutzPage() {
  return (
    <>
      <MarketingNavbar />
      <main className="section-pad">
        <div className="container-app max-w-2xl">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-950">
            Datenschutzerklärung
          </h1>

          <div className="mt-6 rounded-xl2 border border-dashed border-amber-300 bg-amber-50 p-5 text-sm text-amber-900">
            <strong>Hinweis:</strong> Diese Seite ist ein technisches Gerüst mit den
            Abschnitten, die eine Datenschutzerklärung typischerweise braucht.
            Sie ersetzt keine Rechtsberatung. Bitte lasse die Inhalte vor dem
            produktiven Betrieb von einer Anwältin/einem Anwalt oder
            Datenschutzbeauftragten prüfen und ausfüllen.
          </div>

          <div className="mt-4">
            <Section title="1. Verantwortlicher">
              <Placeholder>
                [Platzhalter: Name, Anschrift und Kontaktdaten des Unternehmens, das
                AnfragePilot betreibt.]
              </Placeholder>
            </Section>

            <Section title="2. Welche Daten wir verarbeiten">
              <p>Technisch werden aktuell folgende personenbezogene Daten verarbeitet:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Konto-Daten der Unternehmer:innen:</strong> E-Mail-Adresse
                  (Supabase Auth), Unternehmensdaten (Name, Branche, Telefon,
                  Kontakt-E-Mail, Beschreibung, Logo).
                </li>
                <li>
                  <strong>Kundenanfragen:</strong> Name, E-Mail, Telefon, gewünschte
                  Leistung, Wunschtermin, Ort, Budget, Freitext-Beschreibung sowie
                  optional eine hochgeladene Datei/Foto.
                </li>
                <li>
                  <strong>Technische Daten:</strong> Eine gehashte (nicht die rohe)
                  IP-Adresse zur Spam-/Missbrauchserkennung des öffentlichen
                  Anfrageformulars (siehe Abschnitt 5).
                </li>
              </ul>
            </Section>

            <Section title="3. Zwecke der Verarbeitung">
              <Placeholder>
                [Platzhalter: Zweckbindung je Datenkategorie ausformulieren, z. B.
                Vertragsanbahnung zwischen Kunde und Unternehmer, Kontoverwaltung,
                Missbrauchsprävention.]
              </Placeholder>
            </Section>

            <Section title="4. Hosting und Auftragsverarbeiter">
              <p>AnfragePilot nutzt aktuell folgende Dienstleister:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <strong>Supabase</strong> (Datenbank, Authentifizierung, Datei-Speicher).
                </li>
                <li>
                  <strong>Cloudflare</strong> (Hosting/Ausführung der Anwendung, Workers).
                </li>
              </ul>
              <Placeholder>
                [Platzhalter: Serverstandorte, Auftragsverarbeitungsverträge (AVV) und
                ggf. Drittlandtransfers ergänzen.]
              </Placeholder>
            </Section>

            <Section title="5. Cookies und ähnliche Technologien">
              <p>
                AnfragePilot setzt aktuell ausschließlich technisch notwendige
                Cookies zur Anmeldung (Supabase-Auth-Session). Es werden keine
                Analyse-, Marketing- oder Tracking-Cookies eingesetzt.
              </p>
              <Placeholder>
                [Platzhalter: Falls künftig Analyse-Tools ergänzt werden, hier
                beschreiben und die Cookie-Einwilligung entsprechend anpassen.]
              </Placeholder>
            </Section>

            <Section title="6. Speicherdauer">
              <Placeholder>
                [Platzhalter: Konkrete Löschfristen je Datenkategorie festlegen.]
              </Placeholder>
            </Section>

            <Section title="7. Deine Rechte">
              <p>
                Du kannst deine Daten jederzeit im Dashboard unter „Profil“
                exportieren oder dein Unternehmen bzw. dein gesamtes Konto
                löschen. Darüber hinaus hast du je nach anwendbarem Recht
                weitere Rechte (Auskunft, Berichtigung, Löschung,
                Einschränkung, Widerspruch, Datenübertragbarkeit).
              </p>
              <Placeholder>
                [Platzhalter: Kontaktweg für Datenschutzanfragen sowie Hinweis auf
                Beschwerderecht bei einer Aufsichtsbehörde ergänzen.]
              </Placeholder>
            </Section>
          </div>
        </div>
      </main>
      <MarketingFooter />
    </>
  );
}
