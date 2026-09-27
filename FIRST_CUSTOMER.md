# First Customer

Exakte Schritte, um das erste echte Unternehmen (nicht dich selbst, nicht
eine Demo) auf AnfragePilot zu bringen. Am besten gemeinsam am Bildschirm
mit dem Kunden durchgehen — dauert ca. 15-20 Minuten.

## Voraussetzung

- Deployment ist live und der Smoke-Test aus `DEPLOY_CHECKLIST.md`,
  Abschnitt 9, war erfolgreich.
- Du kennst Branche, gewünschten Unternehmensnamen und mindestens 2-3
  Leistungen des Kunden vorab (macht das Gespräch schneller).

## 1. Konto anlegen

1. Kunde geht auf `/register` (oder du machst es gemeinsam).
2. E-Mail + Passwort, danach ggf. E-Mail-Bestätigung (abhängig von der
   Supabase-Projekteinstellung "Confirm email").
3. Landet automatisch im Onboarding-Wizard.

## 2. Onboarding durchlaufen (10 Schritte)

Der Wizard führt selbst durch; hier nur die Punkte, bei denen du als
Betreiber unterstützen solltest:

1. **Unternehmensname** — echter Name des Betriebs.
2. **Branche** — eine der 5 Vorlagen (Autopflege, Reinigung,
   Gartenservice, Fotografie, Handwerk) wählen. Bestimmt Textbausteine,
   Standard-Leistungen und FAQ-Vorschläge.
3. **Beschreibung** — kurzer Slogan + 2-3 Sätze; Platzhalter-Text zeigt
   ein branchenpassendes Beispiel, falls dem Kunden nichts einfällt.
4. **Logo** — optional, kann später nachgeholt werden.
5. **Leistungen** — die vorgeschlagenen Standard-Leistungen der Branche
   werden automatisch übernommen; danach in `/dashboard/services`
   anpassbar (Preise korrigieren, weitere hinzufügen).
6. **Kontaktdaten** — Telefon/E-Mail, die auf der öffentlichen Seite
   erscheinen.
7. **Öffnungszeiten** — wichtig, falls der Kunde später die Terminbuchung
   nutzen will (Pro-Plan) — ohne gesetzte Öffnungszeiten zeigt die
   Terminbuchung keine freien Slots.
8. **Öffentliche Seite veröffentlichen** — ab hier ist die Seite live und
   öffentlich erreichbar.
9. **Erste Anfrage** — der Wizard zeigt den fertigen Link.
10. **Fertig** — landet in `/dashboard`.

## 3. Den Anfrage-Link übergeben

- Der Link hat die Form `https://DEINE-DOMAIN/<slug>` (Slug wurde beim
  Veröffentlichen automatisch aus dem Unternehmensnamen erzeugt, in
  Schritt 8 vom Kunden noch änderbar).
- Gemeinsam festlegen, wo der Kunde diesen Link platziert: Instagram-Bio,
  Google-Unternehmensprofil, Visitenkarte/QR-Code, bestehende Website.
- Test-Anfrage gemeinsam durchklicken (siehe `DEPLOY_CHECKLIST.md`,
  Abschnitt 9) — der Kunde soll einmal live sehen, wie die
  Benachrichtigung im Dashboard erscheint, bevor ihr auflegt.

## 4. E-Mail-Erwartungen setzen

- Falls `RESEND_API_KEY`/`EMAIL_FROM_ADDRESS` konfiguriert sind (siehe
  `docs/EMAIL.md`): der Kunde bekommt bei jeder neuen Anfrage automatisch
  eine E-Mail an die in Schritt 6 hinterlegte Adresse.
- Falls nicht konfiguriert: klar kommunizieren, dass Benachrichtigungen
  nur im Dashboard/Glocken-Icon erscheinen, keine E-Mail. Kein Grund zur
  Sorge beim Kunden ("kommt da nichts an?") vorab ausräumen.

## 5. Erste echte Anfrage begleiten

- Bei der ersten ECHTEN (nicht Test-)Anfrage: gemeinsam den
  Antwortgenerator zeigen (Ton wählen), das erste Angebot erstellen und
  versenden.
- Sicherstellen, dass der Kunde weiß, wo der Angebots-Link herkommt
  (`/dashboard/quotes` bzw. direkt aus der Anfrage heraus) und wie er ihn
  dem eigenen Kunden schickt (Copy-Button, siehe Angebotsseite).

## 6. Plan-Entscheidung

- Der Kunde startet automatisch mit 14 Tagen Trial im Pro-Funktionsumfang
  (Formular-Builder, Terminbuchung, erweiterte Auswertungen).
- Kurz vor Ablauf des Trials (im Dashboard sichtbar als Banner) selbst
  proaktiv nachfragen, ob ein bezahlter Plan gewünscht ist — kein
  automatischer Reminder-Mechanismus dafür vorhanden.
- Upgrade läuft ausschließlich über `/dashboard/billing` und echtes
  Stripe-Checkout (siehe `SALES_CHECKLIST.md`, Abschnitt 4).

## 7. Falls etwas schiefgeht

- **Seite zeigt 404 unter dem eigenen Slug:** Schritt 8 (Veröffentlichen)
  wurde nicht abgeschlossen — im Dashboard unter "Profil" den
  Veröffentlichen-Schalter prüfen.
- **Anfrage kommt nicht im Dashboard an:** Rate-Limit greift bei mehr als
  5 Anfragen pro Stunde von derselben IP für dasselbe Unternehmen (siehe
  `docs/SECURITY.md`, Abschnitt 5) — bei wiederholten Tests kurz warten
  oder eine andere Verbindung nutzen.
- **Kunde sieht "Diese Funktion ist ab dem Pro-Plan verfügbar":**
  erwartetes Verhalten außerhalb des Trials/Pro-Plans (Formular-Builder,
  Kalender) — kein Bug, siehe `/pricing`.
