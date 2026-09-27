"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Check, Clock, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge, StatCard } from "@/components/ui/Card";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Label, Input, Select } from "@/components/ui/Field";
import { formatCurrencyEUR, STATUS_LABELS, STATUS_BADGE_CLASSES } from "@/lib/format";
import {
  DEMO_BUSINESS,
  DEMO_SERVICES,
  DEMO_FAQ,
  DEMO_LEADS,
  DEMO_QUOTE,
  DEMO_AVAILABLE_SLOTS,
  DEMO_APPOINTMENT,
  DEMO_FUNNEL,
  type DemoLead,
} from "@/lib/demo/data";

const TABS = [
  { key: "site", label: "Öffentliche Seite" },
  { key: "leads", label: "Anfragen" },
  { key: "quote", label: "Angebot" },
  { key: "appointment", label: "Termin" },
  { key: "analytics", label: "Auswertung" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function DemoBanner() {
  return (
    <div className="bg-ink-950 py-2.5 text-center text-sm font-medium text-white">
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-brand-300" />
        Demo-Modus – alle Daten sind Beispieldaten, keine echten Kunden.
      </span>{" "}
      <Link href="/register" className="ml-2 underline hover:no-underline">
        Kostenlos eigenes Konto erstellen →
      </Link>
    </div>
  );
}

function RequestFormDemo({ onSubmitted }: { onSubmitted: (lead: DemoLead) => void }) {
  const [submitted, setSubmitted] = useState(false);
  const services = DEMO_SERVICES.map((s) => s.name);

  if (submitted) {
    return (
      <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-center text-sm font-medium text-brand-800">
        Danke für deine Anfrage! Sie erscheint jetzt im Anfragen-Reiter – so würde{" "}
        {DEMO_BUSINESS.businessName} sie in echt sehen.
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const name = String(new FormData(form).get("name") ?? "Demo-Kunde");
        const service = String(new FormData(form).get("service") ?? services[0]);
        setSubmitted(true);
        onSubmitted({
          id: `local-${Date.now()}`,
          customerName: name || "Demo-Kunde",
          service,
          status: "new",
          createdAt: "gerade eben",
        });
      }}
    >
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required placeholder="Dein Name" />
      </div>
      <div>
        <Label htmlFor="service">Leistung</Label>
        <Select id="service" name="service" defaultValue={services[0]}>
          {services.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" className="w-full">
        Unverbindlich anfragen
      </Button>
      <p className="text-center text-xs text-ink-400">
        Diese Demo-Anfrage wird nirgendwo gespeichert.
      </p>
    </form>
  );
}

function SiteTab({ onLeadSubmitted }: { onLeadSubmitted: (lead: DemoLead) => void }) {
  return (
    <div className="space-y-10">
      <section className="text-center">
        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-xl2 font-display text-xl font-semibold text-white shadow-soft"
          style={{ backgroundColor: DEMO_BUSINESS.accentColor }}
        >
          SG
        </div>
        <h1 className="mt-4 font-display text-2xl font-semibold text-ink-950 sm:text-3xl">
          {DEMO_BUSINESS.businessName}
        </h1>
        <p className="mt-1 text-sm font-medium" style={{ color: DEMO_BUSINESS.accentColor }}>
          {DEMO_BUSINESS.tagline}
        </p>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-500">
          {DEMO_BUSINESS.description}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-xs text-ink-400">
          <span>{DEMO_BUSINESS.phone}</span>
          <span>{DEMO_BUSINESS.email}</span>
        </div>
      </section>

      <section>
        <h2 className="text-center font-display text-lg font-semibold text-ink-950">
          Leistungen
        </h2>
        <div className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          {DEMO_SERVICES.map((service) => (
            <div key={service.name} className="rounded-xl border border-ink-100 p-4">
              <p className="font-medium text-ink-900">{service.name}</p>
              {service.description && (
                <p className="mt-1 text-sm text-ink-500">{service.description}</p>
              )}
              {(service.price !== null || service.duration_minutes !== null) && (
                <p className="mt-2 text-sm font-medium text-ink-700">
                  {service.price !== null && formatCurrencyEUR(service.price)}
                  {service.price !== null && service.duration_minutes !== null && " · "}
                  {service.duration_minutes !== null && `${service.duration_minutes} Min.`}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-center font-display text-lg font-semibold text-ink-950">
          Häufige Fragen
        </h2>
        <div className="mx-auto mt-5 max-w-xl space-y-4">
          {DEMO_FAQ.map((item) => (
            <div key={item.q}>
              <p className="font-medium text-ink-900">{item.q}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{item.a}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-md rounded-2xl border border-ink-100 bg-white p-6">
        <h2 className="text-center font-display text-lg font-semibold text-ink-950">
          Jetzt Anfrage stellen
        </h2>
        <p className="mt-1 text-center text-sm text-ink-500">
          So sieht dein Anfrageformular für Kunden aus.
        </p>
        <div className="mt-5">
          <RequestFormDemo onSubmitted={onLeadSubmitted} />
        </div>
      </section>
    </div>
  );
}

function LeadsTab({ leads }: { leads: DemoLead[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-500">
        So sieht dein Anfrage-Posteingang im Dashboard aus – jede neue Anfrage landet hier
        automatisch.
      </p>
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3.5"
        >
          <div>
            <p className="text-sm font-medium text-ink-900">{lead.customerName}</p>
            <p className="text-xs text-ink-400">
              {lead.service} · {lead.createdAt}
            </p>
          </div>
          <Badge className={STATUS_BADGE_CLASSES[lead.status]}>{STATUS_LABELS[lead.status]}</Badge>
        </div>
      ))}
    </div>
  );
}

function QuoteTab() {
  const subtotal = DEMO_QUOTE.lineItems.reduce((sum, i) => sum + i.quantity * i.unit_price, 0);
  return (
    <div className="mx-auto max-w-lg space-y-5">
      <p className="text-sm text-ink-500">
        So sieht ein Angebot aus, das dein Kunde per Link erhält und online annehmen kann.
      </p>
      <div className="rounded-xl border border-ink-100 bg-white p-6">
        <div className="flex items-center justify-between border-b border-ink-100 pb-4">
          <p className="font-display text-lg font-semibold text-ink-950">{DEMO_QUOTE.title}</p>
          <Badge className="bg-brand-600 text-white">Angenommen</Badge>
        </div>
        <div className="mt-4 space-y-2">
          {DEMO_QUOTE.lineItems.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-ink-700">
                {item.description} ({item.quantity}×)
              </span>
              <span className="font-medium text-ink-900">
                {formatCurrencyEUR(item.quantity * item.unit_price)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-ink-100 pt-3 font-display text-base font-semibold text-ink-950">
          <span>Gesamt</span>
          <span>{formatCurrencyEUR(subtotal)}</span>
        </div>
        <p className="mt-3 text-xs text-ink-400">Gültig {DEMO_QUOTE.validUntil}</p>
      </div>
    </div>
  );
}

function AppointmentTab() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <p className="text-sm text-ink-500">
        Nachdem ein Kunde ein Angebot annimmt, kann er direkt einen freien Termin auswählen.
      </p>
      {selected ? (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-5 text-center text-sm font-medium text-brand-800">
          Termin um {selected} Uhr ausgewählt – {DEMO_BUSINESS.businessName} bekommt sofort eine
          Benachrichtigung.
        </div>
      ) : (
        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <p className="text-center text-sm font-medium text-ink-900">
            Freie Termine am {DEMO_APPOINTMENT.weekday}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {DEMO_AVAILABLE_SLOTS.map((slot) => (
              <button
                key={slot}
                onClick={() => setSelected(slot)}
                className="rounded-lg border border-ink-100 bg-white px-3 py-2.5 text-sm font-medium text-ink-900 hover:border-brand-300 hover:bg-brand-50"
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 rounded-xl border border-ink-100 bg-sand-50 px-4 py-3 text-sm text-ink-600">
        <Clock className="h-4 w-4 shrink-0" />
        Beispiel eines bereits bestätigten Termins: {DEMO_APPOINTMENT.weekday},{" "}
        {DEMO_APPOINTMENT.time} Uhr
      </div>
    </div>
  );
}

function AnalyticsTab() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-500">
        Dein Dashboard zeigt jederzeit, wie viele Anfragen sich in zahlende Aufträge verwandeln.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Neue Anfragen" value={DEMO_FUNNEL.newLeads} />
        <StatCard label="Offene Angebote" value={DEMO_FUNNEL.openQuotes} />
        <StatCard label="Anstehende Termine" value={DEMO_FUNNEL.upcomingAppointments} />
        <StatCard label="Gewonnene Aufträge" value={DEMO_FUNNEL.wonJobs} />
      </div>
      <StatCard
        label="Geschätzter Umsatz (30 Tage)"
        value={formatCurrencyEUR(DEMO_FUNNEL.estimatedRevenueEUR)}
      />
      <div className="rounded-xl border border-ink-100 bg-white p-5">
        <p className="mb-3 text-sm font-medium text-ink-900">Funnel</p>
        <div className="flex items-center gap-2 text-sm text-ink-600">
          <span>Anfragen</span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
          <span>Angebote</span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
          <span>Angenommen</span>
          <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
          <span className="font-medium text-ink-900">Gewonnen</span>
        </div>
      </div>
    </div>
  );
}

export function DemoExperience() {
  const [activeTab, setActiveTab] = useState<TabKey>("site");
  const [leads, setLeads] = useState<DemoLead[]>(DEMO_LEADS);

  function handleLeadSubmitted(lead: DemoLead) {
    setLeads((prev) => [lead, ...prev]);
  }

  return (
    <div className="min-h-screen bg-sand-50">
      <DemoBanner />
      <header className="container-app flex h-16 items-center justify-between">
        <Link href="/" aria-label="AnfragePilot Startseite">
          <Logo />
        </Link>
        <ButtonLink href="/register" size="sm">
          Kostenlos starten
        </ButtonLink>
      </header>

      <nav className="border-y border-ink-100 bg-white">
        <div className="container-app flex gap-1 overflow-x-auto py-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-ink-950 text-white"
                  : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <main className="container-app max-w-3xl py-10">
        {activeTab === "site" && <SiteTab onLeadSubmitted={handleLeadSubmitted} />}
        {activeTab === "leads" && <LeadsTab leads={leads} />}
        {activeTab === "quote" && <QuoteTab />}
        {activeTab === "appointment" && <AppointmentTab />}
        {activeTab === "analytics" && <AnalyticsTab />}
      </main>

      <footer className="border-t border-ink-100 py-8 text-center">
        <p className="text-sm text-ink-500">
          Gefällt dir, was du siehst?{" "}
          <Link href="/register" className="font-semibold text-brand-700 hover:underline">
            <span className="inline-flex items-center gap-1">
              Kostenlos eigenes Konto erstellen <Check className="h-3.5 w-3.5" />
            </span>
          </Link>
        </p>
      </footer>
    </div>
  );
}
