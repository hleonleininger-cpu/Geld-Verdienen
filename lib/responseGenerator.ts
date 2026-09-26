import type { BusinessRow, LeadRow } from "@/types/database";
import { getIndustry, findRecommendation } from "@/lib/industries";
import { formatDateDe } from "@/lib/format";

export type ResponseTone = "freundlich" | "professionell" | "kurz" | "whatsapp";

export const TONE_OPTIONS: { value: ResponseTone; label: string }[] = [
  { value: "freundlich", label: "Freundlich" },
  { value: "professionell", label: "Professionell" },
  { value: "kurz", label: "Kurz" },
  { value: "whatsapp", label: "WhatsApp-Stil" },
];

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

/**
 * Baut eine Antwort komplett aus Textbausteinen zusammen (kein externer
 * KI-Aufruf). Das Ergebnis ist bewusst editierbar gedacht, nicht final.
 */
export function generateResponse(
  lead: LeadRow,
  business: BusinessRow,
  tone: ResponseTone
): string {
  const industry = getIndustry(business.industry);
  const name = firstName(lead.customer_name);
  const recommendation = findRecommendation(
    industry,
    `${lead.service} ${lead.description ?? ""}`
  );
  const dateText = formatDateDe(lead.preferred_date);
  const location = lead.location?.trim();
  const budget = lead.budget?.trim();

  if (tone === "whatsapp") {
    const lines = [
      `Hey ${name}! 👋`,
      `Danke für deine Anfrage zu "${lead.service}".`,
      `Ich würde dir ${recommendation} empfehlen.`,
      lead.preferred_date
        ? `Der ${dateText} passt bei uns grundsätzlich.`
        : `Sag mir gern, welcher Termin dir passt.`,
      budget ? `Preislich bewegen wir uns im Rahmen von ${budget}.` : null,
      `Melde dich, wenn du Fragen hast – sonst schicke ich dir gleich ein Angebot.`,
      `Viele Grüße, ${business.business_name}`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  if (tone === "kurz") {
    const lines = [
      `Hallo ${name},`,
      `danke für deine Anfrage zu "${lead.service}"${location ? ` in ${location}` : ""}.`,
      `Ich empfehle ${recommendation}.${lead.preferred_date ? ` Termin: ${dateText}.` : ""}`,
      `Ich sende dir in Kürze ein passendes Angebot zu.`,
      `Beste Grüße,`,
      business.business_name,
    ];
    return lines.join("\n");
  }

  if (tone === "professionell") {
    const paragraphs = [
      `Sehr geehrte/r ${lead.customer_name},`,
      "",
      `vielen Dank für Ihre Anfrage zu "${lead.service}"${
        location ? ` im Bereich ${location}` : ""
      }. Wir freuen uns über Ihr Interesse an unseren Leistungen.`,
      "",
      `Für Ihr Anliegen empfehlen wir ${recommendation}. ${
        lead.preferred_date
          ? `Der von Ihnen gewünschte Termin am ${dateText} ist aus unserer Sicht grundsätzlich umsetzbar.`
          : "Gerne stimmen wir mit Ihnen einen passenden Termin ab."
      }`,
      "",
      budget
        ? `Ihr genannter Rahmen von ${budget} deckt sich mit unserer Einschätzung; das genaue Angebot erhalten Sie im nächsten Schritt.`
        : `Ein detailliertes Angebot mit transparenten Kosten erhalten Sie im nächsten Schritt von uns.`,
      "",
      `Für Rückfragen stehen wir Ihnen jederzeit zur Verfügung.`,
      "",
      `Mit freundlichen Grüßen`,
      business.business_name,
    ];
    return paragraphs.join("\n");
  }

  // freundlich (Standard)
  const paragraphs = [
    `Hallo ${name},`,
    "",
    `vielen Dank für deine Anfrage zu "${lead.service}"${
      location ? ` in ${location}` : ""
    }. Für dein Vorhaben würde ich dir ${recommendation} empfehlen.`,
    "",
    lead.preferred_date
      ? `Der gewünschte Termin am ${dateText} passt bei uns grundsätzlich gut.`
      : `Sag mir gerne, welcher Termin dir am besten passt.`,
    budget
      ? `Preislich bewegen wir uns im Rahmen deines Budgets von ${budget} – das genaue Angebot bekommst du separat von uns.`
      : `Das genaue Angebot mit allen Details bekommst du im nächsten Schritt von uns.`,
    "",
    `Melde dich gerne, wenn du noch Fragen hast!`,
    "",
    `Viele Grüße`,
    business.business_name,
  ];
  return paragraphs.join("\n");
}
