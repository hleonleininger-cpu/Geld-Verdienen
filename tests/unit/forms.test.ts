import { describe, expect, it } from "vitest";
import { validateDynamicSubmission, fieldInputName } from "@/lib/forms";
import type { RequestFormFieldRow } from "@/types/database";

function makeField(overrides: Partial<RequestFormFieldRow>): RequestFormFieldRow {
  return {
    id: "field-1",
    form_id: "form-1",
    field_type: "text",
    label: "Test-Feld",
    description: null,
    required: false,
    position: 0,
    options: [],
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function baseFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData();
  fd.set("customer_name", overrides.customer_name ?? "Max Mustermann");
  fd.set("customer_email", overrides.customer_email ?? "max@example.com");
  return fd;
}

describe("validateDynamicSubmission — builtin name/email", () => {
  it("rejects a missing name", () => {
    const fd = baseFormData({ customer_name: "" });
    const result = validateDynamicSubmission([], fd);
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid email", () => {
    const fd = baseFormData({ customer_email: "not-an-email" });
    const result = validateDynamicSubmission([], fd);
    expect(result.ok).toBe(false);
  });

  it("accepts a valid submission with no dynamic fields", () => {
    const result = validateDynamicSubmission([], baseFormData());
    expect(result.ok).toBe(true);
  });
});

describe("validateDynamicSubmission — never trusts field definitions from the request", () => {
  it("rejects a select answer that is not one of the field's server-defined options", () => {
    const field = makeField({ field_type: "select", options: ["Klein", "Groß"] });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "Mittel");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(false);
  });

  it("rejects a required field that was omitted", () => {
    const field = makeField({ required: true, label: "Telefon", field_type: "phone" });
    const result = validateDynamicSubmission([field], baseFormData());
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid email in a dynamic email field", () => {
    const field = makeField({ field_type: "email", label: "Zweit-E-Mail" });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "invalid");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(false);
  });

  it("rejects a non-numeric value in a number field", () => {
    const field = makeField({ field_type: "number", label: "Fläche (m²)" });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "abc");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(false);
  });

  it("rejects an unparseable date", () => {
    const field = makeField({ field_type: "date", label: "Wunschtermin" });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "not-a-date");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(false);
  });

  it("rejects a required file field with no upload", () => {
    const field = makeField({ field_type: "file", required: true, label: "Foto" });
    const result = validateDynamicSubmission([field], baseFormData());
    expect(result.ok).toBe(false);
  });

  it("rejects a multiselect answer containing a value outside the defined options", () => {
    const field = makeField({
      field_type: "multiselect",
      options: ["Innenreinigung", "Außenreinigung"],
    });
    const fd = baseFormData();
    fd.append(fieldInputName(field.id), "Innenreinigung");
    fd.append(fieldInputName(field.id), "Sonstiges");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(false);
  });

  it("rejects a required checkbox that was left unchecked", () => {
    const field = makeField({ field_type: "checkbox", required: true, label: "AGB akzeptieren" });
    const result = validateDynamicSubmission([field], baseFormData());
    expect(result.ok).toBe(false);
  });
});

describe("validateDynamicSubmission — deterministic mapping onto existing lead columns", () => {
  it("maps the first phone field to customerPhone", () => {
    const field = makeField({ field_type: "phone", label: "Telefon" });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "0170 1234567");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.customerPhone).toBe("0170 1234567");
  });

  it("maps the first date field to preferredDate", () => {
    const field = makeField({ field_type: "date", label: "Wunschtermin" });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "2026-06-01");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.preferredDate).toBe("2026-06-01");
  });

  it("maps the first textarea field to description", () => {
    const field = makeField({ field_type: "textarea", label: "Details" });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "Bitte kümmert euch um den Vorgarten.");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.description).toBe("Bitte kümmert euch um den Vorgarten.");
  });

  it("puts a second field of the same mapped type into customAnswers instead of overwriting", () => {
    const first = makeField({ id: "phone-1", field_type: "phone", label: "Mobil" });
    const second = makeField({ id: "phone-2", field_type: "phone", label: "Festnetz" });
    const fd = baseFormData();
    fd.set(fieldInputName(first.id), "0170 1111111");
    fd.set(fieldInputName(second.id), "030 2222222");
    const result = validateDynamicSubmission([first, second], fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.customerPhone).toBe("0170 1111111");
      expect(result.data.customAnswers["phone-2"]).toEqual({
        label: "Festnetz",
        value: "030 2222222",
      });
    }
  });

  it("puts an unmapped field type (e.g. select) into customAnswers", () => {
    const field = makeField({ field_type: "select", label: "Größe", options: ["S", "M", "L"] });
    const fd = baseFormData();
    fd.set(fieldInputName(field.id), "M");
    const result = validateDynamicSubmission([field], fd);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.customAnswers[field.id]).toEqual({ label: "Größe", value: "M" });
    }
  });
});
