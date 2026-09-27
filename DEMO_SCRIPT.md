# Demo Script (5 Minuten)

Zeigt den kompletten Funnel: **Besucher → Anfrage → Lead → Angebot →
Annahme → Termin.** Zwei Varianten:

- **Live-Variante** (empfohlen, überzeugender): eigenes Test-Konto, zwei
  Browserfenster (eines normal, eines Inkognito als "der Kunde"). 14 Tage
  Trial schalten den Pro-Funktionsumfang automatisch frei, Terminbuchung
  funktioniert also sofort nach der Registrierung.
- **Fallback-Variante** (`/demo`): kein Konto, kein Setup, funktioniert
  überall sofort — nutzen, wenn spontan ohne Vorbereitung gezeigt wird.
  Kurzhinweise dazu jeweils in Klammern.

Vorbereitung (einmalig, vor dem eigentlichen Gespräch): eigenes Test-Konto
unter `/register` anlegen, Branche wählen, mindestens einen Service
anlegen, öffentliche Seite veröffentlichen. Dauert selbst ~3 Minuten,
also VOR dem Kundengespräch erledigen, nicht während des Timers unten.

---

## Minute 0-1: Der Besucher

**Sagen:** "So sieht die Seite aus, die deine Kunden sehen, wenn sie auf
deinen Link klicken — auf der Website, in der Instagram-Bio oder per
QR-Code."

**Zeigen:** die eigene öffentliche Seite (`/<dein-slug>`) im
Inkognito-Fenster öffnen. Hero, Leistungen, FAQ, Anfrageformular ganz
unten zeigen.

*(Fallback: `/demo` öffnen, Tab "Öffentliche Seite".)*

## Minute 1-2: Anfrage → Lead

**Sagen:** "Ein Kunde füllt das aus — dauert unter einer Minute, kein
Konto nötig."

**Tun:** im Inkognito-Fenster eine Test-Anfrage abschicken (eigenen Namen/
Test-E-Mail nutzen). Danach ins normale Fenster wechseln, `/dashboard`
zeigen: die Anfrage ist bereits da, oben im Glocken-Icon erscheint eine
Benachrichtigung.

**Sagen:** "Das kam gerade eben rein — in Echtzeit, ohne dass irgendwer
etwas aktualisieren musste."

*(Fallback: `/demo`, Tab "Anfragen" — die per Formular im Tab "Öffentliche
Seite" abgeschickte Test-Anfrage erscheint hier oben in der Liste.)*

## Minute 2-3: Antwort → Angebot

**Sagen:** "Jetzt antworte ich in Sekunden, nicht in einer halben Stunde."

**Tun:** die Anfrage öffnen, kurz den Antwortgenerator zeigen (Ton
wechseln: freundlich/professionell/WhatsApp), dann direkt ein Angebot
erstellen — Titel/Preis sind für die Branche schon vorausgefüllt.
"Versenden" klicken.

*(Fallback: `/demo`, Tab "Angebot" — zeigt ein bereits fertiges
Beispiel-Angebot mit Positionen und Summe.)*

## Minute 3-4: Der Kunde sieht das Angebot und nimmt an

**Sagen:** "Das hier bekommt der Kunde als Link — läuft auf jedem
Smartphone, kein Login nötig."

**Tun:** im Inkognito-Fenster den Angebots-Link öffnen (Link kopieren
oder aus dem Dashboard direkt öffnen), Positionen/Summe zeigen, auf
"Angebot annehmen" klicken.

*(Fallback: `/demo`, Tab "Angebot" zeigt den Status bereits als
"Angenommen".)*

## Minute 4-5: Termin

**Sagen:** "Und jetzt das Beste: der Kunde muss nicht mehr anrufen, um
einen Termin zu vereinbaren — er bucht direkt selbst."

**Tun:** direkt nach der Annahme erscheint der Terminkalender auf
derselben Seite; einen freien Slot auswählen und bestätigen. Zurück ins
normale Fenster wechseln: Benachrichtigung "Termin gebucht" zeigen.

**Abschluss-Satz:** "Vom ersten Klick des Kunden bis zum bestätigten
Termin — ganz ohne dass du zwischendurch telefonieren oder E-Mails
schreiben musstest."

*(Fallback: `/demo`, Tab "Termin" — zeigt freie Slots zum Anklicken und
ein Beispiel eines bereits bestätigten Termins.)*

---

## Wenn Zeit bleibt (optional, +2 Minuten)

- `/dashboard` (Übersicht): die Kennzahlen-Kacheln (Neue Anfragen, Offene
  Angebote, Anstehende Termine, Gewonnene Aufträge, Geschätzter Umsatz)
  und den kleinen Funnel-Balken zeigen.
- `/pricing`: die vier Pläne zeigen, falls das Gespräch Richtung "was
  kostet das" geht.

## Häufige Nachfragen und ehrliche Antworten

- **"Bekomme ich eine E-Mail, wenn eine Anfrage reinkommt?"** — Ja, sofern
  E-Mail-Versand eingerichtet ist (Resend, siehe `docs/EMAIL.md`). Sonst
  erscheint die Benachrichtigung nur im Dashboard.
- **"Kann ich mehrere Mitarbeiter einladen?"** — Noch nicht, aktuell ein
  Owner pro Unternehmen.
- **"Kann ich per WhatsApp/SMS benachrichtigt werden?"** — Noch nicht, nur
  E-Mail und In-App-Benachrichtigung.
- **"Was kostet das?"** — Ehrlich auf `/pricing` verweisen, keine
  erfundenen Rabatte oder Sonderkonditionen versprechen, die nicht in
  Stripe hinterlegt sind.
