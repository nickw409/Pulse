import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from "vitest";

const mockSendEvent = vi.fn().mockResolvedValue(undefined);
const mockSendEventBatch = vi.fn().mockResolvedValue(undefined);

vi.mock("../kafka/producer.js", () => ({
  sendEvent: mockSendEvent,
  sendEventBatch: mockSendEventBatch,
}));

vi.mock("../auth/api-key.js", () => ({
  apiKeyAuth: vi.fn(),
}));

const { default: eventsRouter } = await import("./events.js");

import express from "express";
import http from "node:http";

const app = express();
app.use(express.json());
app.use((req: any, _res, next) => {
  req.projectId = "proj_test";
  next();
});
app.use(eventsRouter);

let server: http.Server;
let baseUrl: string;

beforeAll(async () => {
  server = await new Promise<http.Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://localhost:${addr.port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /v1/events", () => {
  it("accepts a valid single event and returns 202", async () => {
    const res = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "page_view", properties: { path: "/" } }),
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.accepted).toBe(true);
    expect(body.eventId).toBeDefined();

    expect(mockSendEvent).toHaveBeenCalledTimes(1);
    expect(mockSendEvent).toHaveBeenCalledWith(
      "events.raw",
      "proj_test",
      expect.objectContaining({
        projectId: "proj_test",
        eventName: "page_view",
        properties: { path: "/" },
      }),
    );
  });

  it("returns 400 for invalid event payload", async () => {
    const res = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(mockSendEvent).not.toHaveBeenCalled();
  });

  it("returns 400 for missing name", async () => {
    const res = await fetch(`${baseUrl}/v1/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { foo: "bar" } }),
    });

    expect(res.status).toBe(400);
  });
});

describe("POST /v1/events/batch", () => {
  it("accepts a valid batch and returns 202", async () => {
    const res = await fetch(`${baseUrl}/v1/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [
          { name: "click", properties: { btn: "cta" } },
          { name: "page_view", properties: { path: "/home" } },
        ],
      }),
    });

    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.accepted).toBe(true);
    expect(body.count).toBe(2);
    expect(body.eventIds).toHaveLength(2);
    expect(mockSendEventBatch).toHaveBeenCalledTimes(1);
  });

  it("returns 400 for empty events array", async () => {
    const res = await fetch(`${baseUrl}/v1/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: [] }),
    });

    expect(res.status).toBe(400);
    expect(mockSendEventBatch).not.toHaveBeenCalled();
  });

  it("returns 400 when any event in batch is invalid", async () => {
    const res = await fetch(`${baseUrl}/v1/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        events: [{ name: "valid" }, { name: "" }],
      }),
    });

    expect(res.status).toBe(400);
    expect(mockSendEventBatch).not.toHaveBeenCalled();
  });
});
