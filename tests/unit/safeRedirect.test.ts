import { describe, expect, it } from "vitest";
import { safeRedirectTarget } from "@/lib/safeRedirect";

describe("safeRedirectTarget", () => {
  it("allows a plain relative path", () => {
    expect(safeRedirectTarget("/dashboard/leads/123")).toBe("/dashboard/leads/123");
  });

  it("falls back for an absolute external URL (open-redirect attempt)", () => {
    expect(safeRedirectTarget("https://evil.example")).toBe("/dashboard");
  });

  it("falls back for a protocol-relative URL (open-redirect attempt)", () => {
    expect(safeRedirectTarget("//evil.example")).toBe("/dashboard");
  });

  it("falls back for a backslash-based open-redirect attempt", () => {
    expect(safeRedirectTarget("/\\evil.example")).toBe("/dashboard");
  });

  it("falls back for an empty string", () => {
    expect(safeRedirectTarget("")).toBe("/dashboard");
  });

  it("supports a custom fallback", () => {
    expect(safeRedirectTarget("javascript:alert(1)", "/")).toBe("/");
  });
});
