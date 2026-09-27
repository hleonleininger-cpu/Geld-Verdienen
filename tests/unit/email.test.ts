import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConsoleEmailProvider } from "@/lib/email/console";
import { ResendEmailProvider } from "@/lib/email/resend";
import {
  leadNotificationTemplate,
  quoteAcceptedEmailTemplate,
  quoteEmailTemplate,
} from "@/lib/email/templates";
import { getEmailProvider } from "@/lib/email";

describe("quoteEmailTemplate", () => {
  it("includes business name, quote title, total, expiry and a link", () => {
    const message = quoteEmailTemplate({
      to: "kunde@example.com",
      businessName: "Glanzwerk Autopflege",
      quoteTitle: "Fahrzeugaufbereitung Komplett",
      totalFormatted: "149,00 €",
      validUntilFormatted: "31.12.2026",
      quoteUrl: "https://example.com/q/abc123",
    });
    expect(message.subject).toContain("Glanzwerk Autopflege");
    expect(message.html).toContain("Fahrzeugaufbereitung Komplett");
    expect(message.html).toContain("149,00 €");
    expect(message.html).toContain("31.12.2026");
    expect(message.html).toContain("https://example.com/q/abc123");
  });

  it("never includes internal-only details (no notes/terms fields exist on the params type)", () => {
    const message = quoteEmailTemplate({
      to: "kunde@example.com",
      businessName: "Glanzwerk Autopflege",
      quoteTitle: "Fahrzeugaufbereitung Komplett",
      totalFormatted: "149,00 €",
      validUntilFormatted: null,
      quoteUrl: "https://example.com/q/abc123",
    });
    // Die Methode nimmt nur oeffentliche Felder entgegen - es gibt keinen
    // Weg, interne Notizen versehentlich mitzusenden.
    expect(message.html).not.toContain("intern");
  });
});

describe("leadNotificationTemplate / quoteAcceptedEmailTemplate", () => {
  it("builds a business-facing lead notification with a dashboard link", () => {
    const message = leadNotificationTemplate({
      to: "owner@example.com",
      businessName: "Glanzwerk Autopflege",
      customerName: "Maria Schmidt",
      service: "Innenreinigung",
      leadUrl: "https://example.com/dashboard/leads/abc",
    });
    expect(message.subject).toContain("Maria Schmidt");
    expect(message.html).toContain("Innenreinigung");
    expect(message.html).toContain("https://example.com/dashboard/leads/abc");
  });

  it("builds a business-facing quote-accepted notification", () => {
    const message = quoteAcceptedEmailTemplate({
      to: "owner@example.com",
      businessName: "Glanzwerk Autopflege",
      customerName: "Maria Schmidt",
      quoteTitle: "Fahrzeugaufbereitung Komplett",
      leadUrl: "https://example.com/dashboard/leads/abc",
    });
    expect(message.subject).toContain("Fahrzeugaufbereitung Komplett");
    expect(message.html).toContain("Maria Schmidt");
  });
});

describe("ConsoleEmailProvider", () => {
  it("is always configured and never fails to 'send'", async () => {
    const provider = new ConsoleEmailProvider();
    expect(provider.isConfigured()).toBe(true);
    const result = await provider.sendEmail({
      to: "kunde@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    });
    expect(result.ok).toBe(true);
  });

  it("implements the full semantic interface via the shared base class", async () => {
    const provider = new ConsoleEmailProvider();
    const result = await provider.sendQuoteEmail({
      to: "kunde@example.com",
      businessName: "Glanzwerk Autopflege",
      quoteTitle: "Test",
      totalFormatted: "10,00 €",
      validUntilFormatted: null,
      quoteUrl: "https://example.com/q/abc",
    });
    expect(result.ok).toBe(true);
  });
});

describe("ResendEmailProvider", () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM_ADDRESS = "AnfragePilot <no-reply@example.com>";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
  });

  it("reports itself as not configured without both env vars", () => {
    delete process.env.EMAIL_FROM_ADDRESS;
    expect(new ResendEmailProvider().isConfigured()).toBe(false);
  });

  it("returns ok:false instead of throwing when the API call fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response("bad request", { status: 400 }));
    const provider = new ResendEmailProvider();
    const result = await provider.sendEmail({
      to: "kunde@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    });
    expect(result.ok).toBe(false);
  });

  it("returns ok:false instead of throwing when fetch itself rejects (timeout/network)", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const provider = new ResendEmailProvider();
    const result = await provider.sendEmail({
      to: "kunde@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    });
    expect(result.ok).toBe(false);
  });

  it("returns ok:true on a successful API response", async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: "abc" }), { status: 200 }));
    const provider = new ResendEmailProvider();
    const result = await provider.sendEmail({
      to: "kunde@example.com",
      subject: "Test",
      html: "<p>Test</p>",
      text: "Test",
    });
    expect(result.ok).toBe(true);
  });
});

describe("getEmailProvider factory", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("falls back to ConsoleEmailProvider when Resend is not configured", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM_ADDRESS;
    expect(getEmailProvider().name).toBe("console");
  });

  it("uses ResendEmailProvider once configured", () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM_ADDRESS = "AnfragePilot <no-reply@example.com>";
    expect(getEmailProvider().name).toBe("resend");
  });
});
