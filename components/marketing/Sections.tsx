import {
  Inbox,
  MessageSquareText,
  FileText,
  Bell,
  Smartphone,
  LayoutGrid,
} from "lucide-react";
import { PRICING_PLANS } from "@/lib/pricing";
import { PricingCard } from "@/components/marketing/PricingCard";
import { ButtonLink } from "@/components/ui/Button";

export function Problem() {
  const points = [
    {
      title: "Anfragen gehen unter",
      text: "WhatsApp, E-Mail, Anrufe, Instagram – Anfragen kommen überall an und werden schnell übersehen.",
    },
    {
      title: "Antworten dauert zu lange",
      text: "Ohne Übersicht antwortest du zu spät – und der Kunde bucht woanders.",
    },
    {
      title: "Kein Überblick über den Wert",
      text: "Wie viele Anfragen sind offen? Wie viel Umsatz steckt gerade in der Pipeline? Schwer zu sagen.",
    },
  ];

  return (
    <section className="section-pad border-t border-ink-100 bg-white">
      <div className="container-app">
        <div className="max-w-2xl">
          <p className="eyebrow">Das Problem</p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
            Kundenanfragen verteilen sich – und gehen dabei verloren.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {points.map((point) => (
            <div key={point.title} className="rounded-xl2 border border-ink-100 p-6">
              <p className="font-display text-lg font-semibold text-ink-950">
                {point.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {point.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Teile deinen Link",
      text: "Du bekommst eine persönliche Anfrageseite (z. B. anfragepilot.de/dein-betrieb) – für Website, Instagram-Bio oder QR-Code.",
    },
    {
      n: "02",
      title: "Kunden stellen Anfragen",
      text: "Kunden füllen ein kurzes, professionelles Formular aus – auf dem Handy genauso einfach wie am Desktop.",
    },
    {
      n: "03",
      title: "Du antwortest in Sekunden",
      text: "Alle Anfragen landen übersichtlich im Dashboard – inklusive Antwort- und Angebotsvorlage.",
    },
  ];

  return (
    <section className="section-pad">
      <div className="container-app">
        <p className="eyebrow">So funktioniert es</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Drei Schritte zu mehr Kunden.
        </h2>
        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.n}>
              <p className="font-display text-4xl font-semibold text-ink-200">
                {step.n}
              </p>
              <p className="mt-3 font-display text-lg font-semibold text-ink-950">
                {step.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                {step.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const features = [
  {
    icon: LayoutGrid,
    title: "Zentrales Dashboard",
    text: "Alle Anfragen an einem Ort, mit klarem Status von Neu bis Gewonnen.",
  },
  {
    icon: MessageSquareText,
    title: "Automatischer Antwortgenerator",
    text: "Fertige, editierbare Antworten – freundlich, professionell oder im WhatsApp-Stil.",
  },
  {
    icon: FileText,
    title: "Angebote in Sekunden",
    text: "Titel, Preis und Gültigkeit eingeben – fertig ist ein hochwertiges Angebot als PDF.",
  },
  {
    icon: Inbox,
    title: "Branchen-Vorlagen",
    text: "Passende Leistungen und Textbausteine für Autopflege, Reinigung, Garten, Foto & Handwerk.",
  },
  {
    icon: Bell,
    title: "Erinnerungen",
    text: "Anfrage später bearbeiten? Ein Klick genügt – AnfragePilot erinnert dich im Dashboard.",
  },
  {
    icon: Smartphone,
    title: "Mobile-first",
    text: "Dashboard und Anfrageformular funktionieren einwandfrei auf dem Smartphone.",
  },
];

export function Features() {
  return (
    <section id="funktionen" className="section-pad border-t border-ink-100 bg-white">
      <div className="container-app">
        <p className="eyebrow">Funktionen</p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Alles, was du brauchst – nichts, was du nicht brauchst.
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-xl2 border border-ink-100 p-6">
              <feature.icon className="h-6 w-6 text-brand-600" strokeWidth={1.75} />
              <p className="mt-4 font-display text-base font-semibold text-ink-950">
                {feature.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
                {feature.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingPreview() {
  return (
    <section className="section-pad">
      <div className="container-app">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Preise</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
              Fair für kleine Betriebe.
            </h2>
          </div>
          <ButtonLink href="/pricing" variant="ghost">
            Alle Details ansehen →
          </ButtonLink>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_PLANS.map((plan) => (
            <PricingCard key={plan.key} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

const faqs = [
  {
    q: "Brauche ich technisches Wissen, um AnfragePilot einzurichten?",
    a: "Nein. Du registrierst dich, hinterlegst deine Unternehmensdaten und bekommst sofort deine persönliche Anfrageseite.",
  },
  {
    q: "Kann ich AnfragePilot auf dem Smartphone nutzen?",
    a: "Ja, sowohl das Dashboard als auch die Anfrageseite sind vollständig für Smartphones optimiert.",
  },
  {
    q: "Nutzt der Antwortgenerator externe KI?",
    a: "Nein. Antworten werden aus intelligenten, branchenspezifischen Textbausteinen zusammengesetzt – schnell, kostenlos und ohne dass Kundendaten an Dritte gesendet werden.",
  },
  {
    q: "Kann ich jederzeit kündigen?",
    a: "Ja. Es gibt keine Mindestlaufzeit. Die Bezahlfunktionen befinden sich aktuell noch im Aufbau.",
  },
  {
    q: "Was passiert mit den Daten meiner Kunden?",
    a: "Kundendaten werden ausschließlich für die Bearbeitung deiner Anfragen gespeichert und sind durch Zugriffsschutz (Row Level Security) nur für dich sichtbar.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="section-pad border-t border-ink-100 bg-white">
      <div className="container-app max-w-3xl">
        <p className="eyebrow">FAQ</p>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-950 sm:text-4xl">
          Häufige Fragen
        </h2>
        <div className="mt-10 divide-y divide-ink-100">
          {faqs.map((faq) => (
            <details key={faq.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between text-left font-medium text-ink-900">
                {faq.q}
                <span className="ml-4 shrink-0 text-ink-400 transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA() {
  return (
    <section className="section-pad">
      <div className="container-app">
        <div className="rounded-2xl bg-ink-950 px-8 py-14 text-center sm:px-16">
          <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
            Bereit, keine Anfrage mehr zu verlieren?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-300">
            Starte kostenlos und richte deine persönliche Anfrageseite in
            wenigen Minuten ein.
          </p>
          <div className="mt-7">
            <ButtonLink href="/register" variant="secondary" size="lg">
              Jetzt kostenlos testen
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
