import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPublish = vi.fn().mockResolvedValue(1);

vi.mock("./redis.js", () => ({
  redis: {
    publish: mockPublish,
  },
}));

const { publishNewEvent, publishCounterUpdate } = await import(
  "./sse-publisher.js"
);

describe("publishNewEvent", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes to correct channel with event data", async () => {
    const event = {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      projectId: "proj_1",
      eventName: "page_view",
      properties: { path: "/home" },
      timestamp: "2026-03-01T12:00:00.000Z",
      receivedAt: "2026-03-01T12:00:01.000Z",
    };

    await publishNewEvent(event);

    expect(mockPublish).toHaveBeenCalledWith(
      "pulse:sse:proj_1",
      JSON.stringify({
        type: "new_event",
        data: {
          eventName: "page_view",
          properties: { path: "/home" },
          timestamp: "2026-03-01T12:00:00.000Z",
        },
      }),
    );
  });
});

describe("publishCounterUpdate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("publishes counter update to correct channel", async () => {
    await publishCounterUpdate("proj_2", "click", { "1m": 5, "1h": 120 });

    expect(mockPublish).toHaveBeenCalledWith(
      "pulse:sse:proj_2",
      JSON.stringify({
        type: "counter_update",
        data: {
          eventName: "click",
          counts: { "1m": 5, "1h": 120 },
        },
      }),
    );
  });
});
