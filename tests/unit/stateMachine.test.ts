import { describe, expect, it } from "vitest";
import {
  canTransitionLeadStatus,
  canTransitionQuoteStatus,
  canTransitionAppointmentStatus,
  isLeadOpen,
  isQuoteFinal,
  isAppointmentFinal,
} from "@/lib/stateMachine";

describe("canTransitionLeadStatus", () => {
  it("allows the forward happy path", () => {
    expect(canTransitionLeadStatus("new", "contacted")).toBe(true);
    expect(canTransitionLeadStatus("contacted", "quote_sent")).toBe(true);
    expect(canTransitionLeadStatus("quote_sent", "won")).toBe(true);
  });

  it("allows staying in the same status (no-op update)", () => {
    expect(canTransitionLeadStatus("new", "new")).toBe(true);
  });

  it("rejects moving a won lead back to any other status", () => {
    expect(canTransitionLeadStatus("won", "new")).toBe(false);
    expect(canTransitionLeadStatus("won", "lost")).toBe(false);
  });

  it("rejects moving a lost lead directly to won (must re-enter via new)", () => {
    expect(canTransitionLeadStatus("lost", "won")).toBe(false);
    expect(canTransitionLeadStatus("lost", "new")).toBe(true);
  });

  it("allows any open status to be marked lost", () => {
    for (const status of ["new", "contacted", "qualified", "quote_sent", "negotiating"] as const) {
      expect(canTransitionLeadStatus(status, "lost")).toBe(true);
    }
  });
});

describe("canTransitionQuoteStatus", () => {
  it("allows draft -> sent, sent -> viewed/accepted/declined/expired", () => {
    expect(canTransitionQuoteStatus("draft", "sent")).toBe(true);
    expect(canTransitionQuoteStatus("sent", "viewed")).toBe(true);
    expect(canTransitionQuoteStatus("sent", "accepted")).toBe(true);
    expect(canTransitionQuoteStatus("viewed", "accepted")).toBe(true);
  });

  it("rejects sending a quote directly without going through draft semantics reversed", () => {
    expect(canTransitionQuoteStatus("sent", "draft")).toBe(false);
  });

  it("rejects any transition out of a final quote status", () => {
    expect(canTransitionQuoteStatus("accepted", "declined")).toBe(false);
    expect(canTransitionQuoteStatus("declined", "accepted")).toBe(false);
    expect(canTransitionQuoteStatus("expired", "sent")).toBe(false);
  });
});

describe("canTransitionAppointmentStatus", () => {
  it("allows scheduled -> confirmed -> completed", () => {
    expect(canTransitionAppointmentStatus("scheduled", "confirmed")).toBe(true);
    expect(canTransitionAppointmentStatus("confirmed", "completed")).toBe(true);
  });

  it("allows cancelling from scheduled or confirmed", () => {
    expect(canTransitionAppointmentStatus("scheduled", "cancelled")).toBe(true);
    expect(canTransitionAppointmentStatus("confirmed", "cancelled")).toBe(true);
  });

  it("rejects any transition out of a final appointment status", () => {
    expect(canTransitionAppointmentStatus("completed", "scheduled")).toBe(false);
    expect(canTransitionAppointmentStatus("cancelled", "scheduled")).toBe(false);
    expect(canTransitionAppointmentStatus("no_show", "completed")).toBe(false);
  });
});

describe("status helpers", () => {
  it("isLeadOpen is false only for won/lost", () => {
    expect(isLeadOpen("won")).toBe(false);
    expect(isLeadOpen("lost")).toBe(false);
    expect(isLeadOpen("new")).toBe(true);
    expect(isLeadOpen("negotiating")).toBe(true);
  });

  it("isQuoteFinal is true only for accepted/declined/expired", () => {
    expect(isQuoteFinal("accepted")).toBe(true);
    expect(isQuoteFinal("declined")).toBe(true);
    expect(isQuoteFinal("expired")).toBe(true);
    expect(isQuoteFinal("sent")).toBe(false);
    expect(isQuoteFinal("draft")).toBe(false);
  });

  it("isAppointmentFinal is true only for completed/cancelled/no_show", () => {
    expect(isAppointmentFinal("completed")).toBe(true);
    expect(isAppointmentFinal("cancelled")).toBe(true);
    expect(isAppointmentFinal("no_show")).toBe(true);
    expect(isAppointmentFinal("scheduled")).toBe(false);
    expect(isAppointmentFinal("confirmed")).toBe(false);
  });
});
