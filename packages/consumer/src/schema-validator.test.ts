import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFindUnique = vi.fn();

vi.mock("./db.js", () => ({
  db: {
    eventSchema: {
      findUnique: mockFindUnique,
    },
  },
}));

const { validateAgainstSchema } = await import("./schema-validator.js");

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    projectId: "proj_1",
    eventName: "purchase",
    properties: { amount: 42, currency: "USD" },
    timestamp: "2026-03-01T12:00:00.000Z",
    receivedAt: "2026-03-01T12:00:01.000Z",
    ...overrides,
  };
}

describe("validateAgainstSchema", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes when no schema is defined", async () => {
    mockFindUnique.mockResolvedValue(null);
    const result = await validateAgainstSchema(makeEvent());
    expect(result).toEqual({ valid: true });
  });

  it("passes when all required fields are present and correct type", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [
        { name: "amount", type: "number", required: true },
        { name: "currency", type: "string", required: true },
      ],
    });
    const result = await validateAgainstSchema(
      makeEvent({ eventName: "valid_fields_test" }),
    );
    expect(result).toEqual({ valid: true });
  });

  it("fails when required field is missing", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [
        { name: "amount", type: "number", required: true },
        { name: "description", type: "string", required: true },
      ],
    });
    const result = await validateAgainstSchema(
      makeEvent({ eventName: "missing_field_test", properties: { amount: 42 } }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field: description");
  });

  it("fails when field has wrong type", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [{ name: "amount", type: "string", required: true }],
    });
    const result = await validateAgainstSchema(
      makeEvent({ eventName: "wrong_type_test", properties: { amount: 42 } }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors![0]).toMatch(/expected type "string"/);
  });

  it("passes when optional field is missing", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [{ name: "optionalField", type: "string", required: false }],
    });
    const result = await validateAgainstSchema(
      makeEvent({ eventName: "optional_test", properties: {} }),
    );
    expect(result).toEqual({ valid: true });
  });

  it("validates boolean type correctly", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [{ name: "active", type: "boolean", required: true }],
    });
    const result = await validateAgainstSchema(
      makeEvent({ eventName: "bool_test", properties: { active: true } }),
    );
    expect(result).toEqual({ valid: true });
  });

  it("validates array type correctly", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [{ name: "tags", type: "array", required: true }],
    });
    const valid = await validateAgainstSchema(
      makeEvent({ properties: { tags: ["a", "b"] } }),
    );
    expect(valid).toEqual({ valid: true });

    const invalid = await validateAgainstSchema(
      makeEvent({ eventName: "other", properties: { tags: "not-array" } }),
    );
    expect(invalid.valid).toBe(false);
  });

  it("validates object type (rejects arrays)", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [{ name: "metadata", type: "object", required: true }],
    });
    const validResult = await validateAgainstSchema(
      makeEvent({ properties: { metadata: { key: "val" } } }),
    );
    expect(validResult).toEqual({ valid: true });

    const arrayResult = await validateAgainstSchema(
      makeEvent({ eventName: "other2", properties: { metadata: [1, 2] } }),
    );
    expect(arrayResult.valid).toBe(false);
  });

  it("collects multiple errors", async () => {
    mockFindUnique.mockResolvedValue({
      fields: [
        { name: "a", type: "string", required: true },
        { name: "b", type: "number", required: true },
      ],
    });
    const result = await validateAgainstSchema(
      makeEvent({ eventName: "multi_err", properties: { a: 123, b: "not-num" } }),
    );
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(2);
  });
});
