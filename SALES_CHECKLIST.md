# Sales Checklist

Praktischer Leitfaden für den Verkauf: Produkt zeigen, ersten Kunden
onboarden, Feedback einsammeln, auf einen bezahlten Plan bringen.

## 1. Produkt demonstrieren

- Für ein spontanes Gespräch ohne Vorbereitung: **`/demo`** teilen (kein
  Login nötig, rein clientseitig, immer verfügbar, keine echten Daten
  können dabei kaputtgehen). Ausführliches Skript dafür:
  `DEMO_SCRIPT.md`.
- Für ein tieferes Gespräch mit einem konkreten Interessenten: dein
  eigenes Test-Konto (siehe `DEPLOY_CHECKLIST.md`, Abschnitt 3) nutzen und
  live eine Anfrage → Angebot → Terminbuchung durchspielen — wirkt
  glaubwürdiger als die Demo, weil es "echt" aussieht.
- Nie zeigen/versprechen, was (noch) nicht existiert: kein Team-/
  Rollenmodell, kein echter SMS/WhatsApp-Versand, Kalender/Formular-
  Builder sind Pro-Plan-Features (siehe `/pricing`).

## 2. Ersten Kunden onboarden

Ausführliche Schritt-für-Schritt-Anleitung: `FIRST_CUSTOMER.md`. Kurz:

1. Kunde registriert sich selbst unter `/register` (oder du machst es
   gemeinsam am Bildschirm) — das Onboarding fragt alles Nötige ab.
2. Gemeinsam die öffentliche Seite ansehen und den Anfrage-Link
   (`/<slug>`) kopieren — das ist der Link, den der Kunde ab jetzt auf
   seiner Website/Instagram-Bio/Visitenkarte nutzt.
3. Zeigen, wie eine eingehende Anfrage im Dashboard erscheint und wie man
   in unter einer Minute ein Angebot daraus erstellt.
4. Erwartungen setzen: E-Mail-Versand funktioniert nur, wenn du (der
   Betreiber) `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` konfiguriert hast
   (siehe `docs/EMAIL.md`) — sonst sieht der Kunde Benachrichtigungen nur
   im Dashboard, nicht per E-Mail.

## 3. Feedback einsammeln

- Nach den ersten 1-2 Wochen aktiver Nutzung nachfragen (persönlich,
  keine Automatisierung dafür vorhanden): Was hat gefehlt? Wo war es
  verwirrend? Wurde tatsächlich ein Angebot verschickt/angenommen?
- Objektive Zahlen dafür statt nur Bauchgefühl: `/admin` zeigt den
  kompletten Funnel (Landing-Aufrufe → Signup → Onboarding →
  veröffentlichte Seite → erste Anfrage → erstes Angebot → Angebot
  versendet/angesehen/angenommen → Termin gebucht → gewonnen → Trial →
  Checkout → Abo) mit Zeitraum-Filter. Bricht der Kunde an einer
  bestimmten Stelle ab, siehst du das hier zuerst.
- Notizen zu Kundengesprächen: aktuell kein eingebautes CRM-Feld dafür —
  extern führen (Notizen-App, Spreadsheet), nicht in der App erfinden.

## 4. Auf einen bezahlten Plan bringen

- Der Kunde upgraded selbst unter `/dashboard/billing` — es gibt bewusst
  keinen Weg, einen Plan "von Hand" in der Datenbank freizuschalten, ohne
  über Stripe zu gehen (siehe `docs/BILLING.md`, "Webhooks als einzige
  Quelle der Wahrheit"). Wenn Stripe nicht konfiguriert ist, zeigt die
  Seite nur einen Hinweis statt eines funktionierenden Buttons — Stripe
  muss also vor dem ersten Verkaufsgespräch eingerichtet sein (siehe
  `DEPLOY_CHECKLIST.md`, Abschnitt 6).
- 14 Tage Trial starten automatisch mit dem Pro-Funktionsumfang, sobald
  sich jemand registriert — kein manueller Schritt nötig.
- Der Kunde kann sein Abo jederzeit selbst in `/dashboard/billing`
  kündigen ("Abo kündigen", mit Bestätigung) oder über "Abo verwalten"
  (Stripe Customer Portal) Zahlungsmethode/Rechnungen verwalten.
- Falls ein Kunde eine Sonderkonditionen-Absprache braucht (z. B.
  Rabatt): das läuft direkt in Stripe (Coupon/Rabattcode auf den
  Checkout anwenden), nicht in der App.
