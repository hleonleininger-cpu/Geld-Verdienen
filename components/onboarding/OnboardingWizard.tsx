"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Check, ExternalLink, Copy } from "lucide-react";
import { Label, Input, Textarea, Select, FieldHint } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { INDUSTRY_LIST, getIndustry } from "@/lib/industries";
import { DAY_LABELS, DEFAULT_OPENING_HOURS } from "@/lib/openingHours";
import {
  onboardingStep1,
  onboardingStep2,
  onboardingStep3,
  onboardingStep4Logo,
  onboardingStep5,
  onboardingStep6,
  onboardingStep7,
  onboardingStep8Publish,
  onboardingStep9,
  onboardingComplete,
  type OnboardingState,
} from "@/app/onboarding/actions";
import type { BusinessRow, OpeningHoursEntry } from "@/types/database";

const TOTAL_STEPS = 10;
const STEP_TITLES = [
  "Unternehmensname",
  "Branche",
  "Beschreibung",
  "Logo",
  "Leistungen",
  "Kontaktdaten",
  "Öffnungszeiten",
  "Öffentliche Seite",
  "Erste Anfrage",
  "Fertig",
];

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="w-full" disabled={pending}>
      {pending ? "Wird gespeichert…" : children}
    </Button>
  );
}

function ErrorText({ state }: { state: OnboardingState }) {
  if (!state?.error) return null;
  return <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>;
}

function ProgressBar({ step }: { step: number }) {
  const pct = Math.round((Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100);
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs font-medium text-ink-500">
        <span>
          Schritt {Math.min(step, TOTAL_STEPS)} von {TOTAL_STEPS}: {STEP_TITLES[Math.min(step, TOTAL_STEPS) - 1]}
        </span>
        <span>{pct}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink-100">
        <div
          className="h-full rounded-full bg-brand-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function OnboardingWizard({
  initialBusiness,
  initialServiceCount,
}: {
  initialBusiness: BusinessRow | null;
  initialServiceCount: number;
}) {
  const resumeStep = initialBusiness ? Math.min(initialBusiness.onboarding_step + 1, 10) : 1;
  const [step, setStep] = useState(Math.max(1, resumeStep));
  const [businessName, setBusinessName] = useState(initialBusiness?.business_name ?? "");
  const [industry, setIndustry] = useState(initialBusiness?.industry ?? "");
  const [slug, setSlug] = useState(initialBusiness?.slug ?? "");

  return (
    <div className="card-surface p-6 sm:p-8">
      <ProgressBar step={step} />

      {step === 1 && (
        <Step1
          defaultValue={businessName}
          onDone={(name) => {
            setBusinessName(name);
            setStep(2);
          }}
        />
      )}
      {step === 2 && (
        <Step2
          defaultValue={industry}
          onDone={(value) => {
            setIndustry(value);
            setStep(3);
          }}
        />
      )}
      {step === 3 && (
        <Step3
          industryKey={industry}
          defaultDescription={initialBusiness?.description ?? ""}
          defaultTagline={initialBusiness?.tagline ?? ""}
          onDone={() => setStep(4)}
        />
      )}
      {step === 4 && <Step4 onDone={() => setStep(5)} />}
      {step === 5 && (
        <Step5
          industryKey={industry}
          hasExistingServices={initialServiceCount > 0}
          onDone={() => setStep(6)}
        />
      )}
      {step === 6 && (
        <Step6
          defaultPhone={initialBusiness?.phone ?? ""}
          defaultEmail={initialBusiness?.email ?? ""}
          onDone={() => setStep(7)}
        />
      )}
      {step === 7 && <Step7 onDone={() => setStep(8)} />}
      {step === 8 && (
        <Step8
          slug={slug || businessName}
          onDone={(finalSlug) => {
            if (finalSlug) setSlug(finalSlug);
            setStep(9);
          }}
        />
      )}
      {step === 9 && <Step9 slug={slug} onDone={() => setStep(10)} />}
      {step === 10 && <Step10 />}
    </div>
  );
}

function Step1({
  defaultValue,
  onDone,
}: {
  defaultValue: string;
  onDone: (name: string) => void;
}) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep1(prev, fd);
    if (!result?.error) onDone(String(fd.get("business_name") ?? ""));
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">
          Wie heißt dein Unternehmen?
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          So wird dich dein Kunde auf deiner Anfrageseite sehen.
        </p>
      </div>
      <div>
        <Label htmlFor="business_name">Unternehmensname</Label>
        <Input
          id="business_name"
          name="business_name"
          required
          defaultValue={defaultValue}
          placeholder="z. B. Glanzwerk Autopflege"
          autoFocus
        />
      </div>
      <ErrorText state={state} />
      <SubmitButton>Weiter</SubmitButton>
    </form>
  );
}

function Step2({ defaultValue, onDone }: { defaultValue: string; onDone: (v: string) => void }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep2(prev, fd);
    if (!result?.error) onDone(String(fd.get("industry") ?? ""));
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">Was ist deine Branche?</h2>
        <p className="mt-1 text-sm text-ink-500">
          Wir passen Vorlagen und Textbausteine automatisch daran an.
        </p>
      </div>
      <div>
        <Label htmlFor="industry">Branche</Label>
        <Select id="industry" name="industry" required defaultValue={defaultValue}>
          <option value="" disabled>
            Branche wählen…
          </option>
          {INDUSTRY_LIST.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </Select>
      </div>
      <ErrorText state={state} />
      <SubmitButton>Weiter</SubmitButton>
    </form>
  );
}

function Step3({
  industryKey,
  defaultDescription,
  defaultTagline,
  onDone,
}: {
  industryKey: string;
  defaultDescription: string;
  defaultTagline: string;
  onDone: () => void;
}) {
  const industry = getIndustry(industryKey);
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep3(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">
          Beschreibe dein Angebot
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Das sehen Kunden auf deiner öffentlichen Seite.
        </p>
      </div>
      <div>
        <Label htmlFor="tagline" optional>
          Kurzer Slogan
        </Label>
        <Input id="tagline" name="tagline" defaultValue={defaultTagline} placeholder={industry.tagline} />
      </div>
      <div>
        <Label htmlFor="description" optional>
          Beschreibung
        </Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={defaultDescription}
          placeholder={industry.description}
        />
      </div>
      <ErrorText state={state} />
      <SubmitButton>Weiter</SubmitButton>
    </form>
  );
}

function Step4({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep4Logo(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">Lade dein Logo hoch</h2>
        <p className="mt-1 text-sm text-ink-500">Optional – du kannst das später nachholen.</p>
      </div>
      <div>
        <Label htmlFor="logo" optional>
          Logo
        </Label>
        <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
        <FieldHint>PNG, JPG oder WEBP, max. 3 MB.</FieldHint>
      </div>
      <ErrorText state={state} />
      <div className="flex gap-2">
        <SubmitButton>Weiter</SubmitButton>
      </div>
    </form>
  );
}

function Step5({
  industryKey,
  hasExistingServices,
  onDone,
}: {
  industryKey: string;
  hasExistingServices: boolean;
  onDone: () => void;
}) {
  const industry = getIndustry(industryKey);
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep5(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">Deine Hauptleistungen</h2>
        <p className="mt-1 text-sm text-ink-500">
          {hasExistingServices
            ? "Du hast bereits Leistungen hinterlegt."
            : "Wir legen dir passende Standard-Leistungen für deine Branche an – du kannst sie jederzeit im Dashboard anpassen."}
        </p>
      </div>
      {!hasExistingServices && (
        <ul className="space-y-2">
          {industry.services.slice(0, 3).map((service) => (
            <li
              key={service.name}
              className="flex items-center justify-between gap-2.5 rounded-lg border border-ink-100 px-3.5 py-2.5 text-sm text-ink-700"
            >
              <span className="flex items-center gap-2.5">
                <Check className="h-4 w-4 text-brand-600" />
                {service.name}
              </span>
              {service.price !== null && (
                <span className="text-ink-400">{service.price} €</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <ErrorText state={state} />
      <SubmitButton>{hasExistingServices ? "Weiter" : "Übernehmen & weiter"}</SubmitButton>
    </form>
  );
}

function Step6({
  defaultPhone,
  defaultEmail,
  onDone,
}: {
  defaultPhone: string;
  defaultEmail: string;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep6(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">Kontaktdaten</h2>
        <p className="mt-1 text-sm text-ink-500">Damit dich Kunden erreichen können.</p>
      </div>
      <div>
        <Label htmlFor="phone" optional>
          Telefon
        </Label>
        <Input id="phone" name="phone" type="tel" defaultValue={defaultPhone} />
      </div>
      <div>
        <Label htmlFor="email" optional>
          Kontakt-E-Mail
        </Label>
        <Input id="email" name="email" type="email" defaultValue={defaultEmail} />
      </div>
      <ErrorText state={state} />
      <SubmitButton>Weiter</SubmitButton>
    </form>
  );
}

function Step7({ onDone }: { onDone: () => void }) {
  const [hours, setHours] = useState<OpeningHoursEntry[]>(DEFAULT_OPENING_HOURS);
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep7(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">Öffnungszeiten</h2>
        <p className="mt-1 text-sm text-ink-500">Wird auf deiner öffentlichen Seite angezeigt.</p>
      </div>
      <input type="hidden" name="opening_hours" value={JSON.stringify(hours)} />
      <div className="space-y-2">
        {hours.map((entry, i) => (
          <div key={entry.day} className="flex items-center gap-3 text-sm">
            <span className="w-24 shrink-0 text-ink-700">{DAY_LABELS[entry.day]}</span>
            <label className="flex items-center gap-1.5 text-ink-500">
              <input
                type="checkbox"
                checked={!entry.closed}
                onChange={(e) =>
                  setHours((h) =>
                    h.map((d, idx) => (idx === i ? { ...d, closed: !e.target.checked } : d))
                  )
                }
              />
              geöffnet
            </label>
            {!entry.closed && (
              <>
                <input
                  type="time"
                  value={entry.open}
                  onChange={(e) =>
                    setHours((h) => h.map((d, idx) => (idx === i ? { ...d, open: e.target.value } : d)))
                  }
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
                <span className="text-ink-400">–</span>
                <input
                  type="time"
                  value={entry.close}
                  onChange={(e) =>
                    setHours((h) => h.map((d, idx) => (idx === i ? { ...d, close: e.target.value } : d)))
                  }
                  className="rounded-lg border border-ink-200 px-2 py-1"
                />
              </>
            )}
          </div>
        ))}
      </div>
      <ErrorText state={state} />
      <SubmitButton>Weiter</SubmitButton>
    </form>
  );
}

function Step8({ slug, onDone }: { slug: string; onDone: (finalSlug?: string) => void }) {
  const [state, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep8Publish(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">
          Deine öffentliche Seite
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Deine Anfrageseite ist erreichbar unter <strong>/{slug}</strong>. Während deiner
          Testphase kannst du bereits eine eigene Akzentfarbe wählen.
        </p>
      </div>
      <div>
        <Label htmlFor="accent_color" optional>
          Akzentfarbe (Hex)
        </Label>
        <Input id="accent_color" name="accent_color" placeholder="#1c9166" />
        <FieldHint>Nach der Testphase Teil des Starter-/Pro-Plans.</FieldHint>
      </div>
      <ErrorText state={state} />
      <SubmitButton>Jetzt veröffentlichen</SubmitButton>
    </form>
  );
}

function Step9({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const [, formAction] = useActionState<OnboardingState, FormData>(async (prev, fd) => {
    const result = await onboardingStep9(prev, fd);
    if (!result?.error) onDone();
    return result;
  }, null);

  const url = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/${slug}` : `/${slug}`),
    [slug]
  );

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">
          Bereit für deine erste Anfrage
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          Teile diesen Link mit deinen Kunden – z. B. auf Instagram, deiner Website oder per
          WhatsApp.
        </p>
      </div>
      <div className="flex items-center gap-2 rounded-lg border border-ink-200 px-3.5 py-2.5 text-sm text-ink-700">
        <span className="truncate">{url}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              // Zwischenablage evtl. nicht verfügbar – Link bleibt sichtbar.
            }
          }}
          className="ml-auto flex shrink-0 items-center gap-1 text-brand-700 hover:underline"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied ? "Kopiert!" : "Kopieren"}
        </button>
      </div>
      <a
        href={`/${slug}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
      >
        <ExternalLink className="h-4 w-4" />
        Anfrageseite ansehen
      </a>
      <SubmitButton>Weiter</SubmitButton>
    </form>
  );
}

function Step10() {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
        <Check className="h-7 w-7 text-brand-600" />
      </div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink-950">Alles bereit!</h2>
        <p className="mt-1 text-sm text-ink-500">
          Dein Unternehmen ist eingerichtet und deine Anfrageseite ist live. Im Dashboard siehst
          du, was als Nächstes ansteht.
        </p>
      </div>
      <form action={onboardingComplete}>
        <Button type="submit" size="lg" className="w-full">
          Zum Dashboard
        </Button>
      </form>
      <p className="text-xs text-ink-400">
        <Link href="/dashboard" className="hover:underline">
          Überspringen
        </Link>
      </p>
    </div>
  );
}
