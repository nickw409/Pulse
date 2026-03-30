import { describe, it, expect } from "vitest";
import {
  ingestEventSchema,
  ingestBatchSchema,
  rawEventSchema,
} from "./validation.js";

describe("ingestEventSchema", () => {
  it("accepts a valid event with all fields", () => {
    const result = ingestEventSchema.safeParse({
      name: "page_view",
      properties: { path: "/home", referrer: "google" },
      timestamp: "2026-03-01T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "page_view",
      properties: { path: "/home", referrer: "google" },
      timestamp: "2026-03-01T12:00:00.000Z",
    });
  });

  it("defaults properties to empty object", () => {
    const result = ingestEventSchema.safeParse({ name: "click" });
    expect(result.success).toBe(true);
    expect(result.data!.properties).toEqual({});
  });

  it("allows optional timestamp", () => {
    const result = ingestEventSchema.safeParse({ name: "click" });
    expect(result.success).toBe(true);
    expect(result.data!.timestamp).toBeUndefined();
  });

  it("rejects empty name", () => {
    const result = ingestEventSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 256 chars", () => {
    const result = ingestEventSchema.safeParse({ name: "a".repeat(257) });
    expect(result.success).toBe(false);
  });

  it("rejects missing name", () => {
    const result = ingestEventSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid timestamp format", () => {
    const result = ingestEventSchema.safeParse({
      name: "test",
      timestamp: "not-a-date",
    });
    expect(result.success).toBe(false);
  });
});

describe("ingestBatchSchema", () => {
  it("accepts a valid batch", () => {
    const result = ingestBatchSchema.safeParse({
      events: [
        { name: "click", properties: { x: 10 } },
        { name: "page_view" },
      ],
    });
    expect(result.success).toBe(true);
    expect(result.data!.events).toHaveLength(2);
  });

  it("rejects empty events array", () => {
    const result = ingestBatchSchema.safeParse({ events: [] });
    expect(result.success).toBe(false);
  });

  it("rejects batch with more than 100 events", () => {
    const events = Array.from({ length: 101 }, (_, i) => ({
      name: `event_${i}`,
    }));
    const result = ingestBatchSchema.safeParse({ events });
    expect(result.success).toBe(false);
  });

  it("rejects batch with invalid event in array", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ name: "valid" }, { name: "" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("rawEventSchema", () => {
  const validRaw = {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    projectId: "proj_123",
    eventName: "purchase",
    properties: { amount: 99.99 },
    timestamp: "2026-03-01T12:00:00.000Z",
    receivedAt: "2026-03-01T12:00:01.000Z",
  };

  it("accepts a valid raw event", () => {
    const result = rawEventSchema.safeParse(validRaw);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validRaw);
  });

  it("rejects non-UUID id", () => {
    const result = rawEventSchema.safeParse({ ...validRaw, id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects empty projectId", () => {
    const result = rawEventSchema.safeParse({ ...validRaw, projectId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const { timestamp, ...incomplete } = validRaw;
    const result = rawEventSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});
