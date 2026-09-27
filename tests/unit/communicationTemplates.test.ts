import { describe, expect, it } from "vitest";
import { buildQuoteMessage } from "@/lib/communication/templates";
import { ClipboardProvider } from "@/lib/communication/clipboard";

describe("buildQuoteMessage", () => {
  it("greets the customer by first name only", () => {
    const message = buildQuoteMessage({
      customerName: "Maria Schmidt",
      businessName: "Glanzwerk Autopflege",
      quoteUrl: "https://example.com/q/abc123",
      totalFormatted: "149,00 €",
    });
    expect(message.body).toContain("Hallo Maria,");
    expect(message.body).not.toContain("Schmidt");
  });

  it("includes the quote URL and formatted total", () => {
    const message = buildQuoteMessage({
      customerName: "Maria",
      businessName: "Glanzwerk Autopflege",
      quoteUrl: "https://example.com/q/abc123",
      totalFormatted: "149,00 €",
    });
    expect(message.body).toContain("https://example.com/q/abc123");
    expect(message.body).toContain("149,00 €");
  });

  it("includes the business name in the subject", () => {
    const message = buildQuoteMessage({
      customerName: "Maria",
      businessName: "Glanzwerk Autopflege",
      quoteUrl: "https://example.com/q/abc123",
      totalFormatted: "149,00 €",
    });
    expect(message.subject).toContain("Glanzwerk Autopflege");
  });
});

describe("ClipboardProvider", () => {
  it("never reports itself as able to actually send a channel", () => {
    const provider = new ClipboardProvider();
    expect(provider.canSend("email")).toBe(false);
    expect(provider.canSend("sms")).toBe(false);
    expect(provider.canSend("whatsapp")).toBe(false);
  });

  it("send() always fails with an explanatory error, never throws", async () => {
    const provider = new ClipboardProvider();
    const result = await provider.send({
      to: "kunde@example.com",
      channel: "email",
      template: { body: "Test" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });
});
