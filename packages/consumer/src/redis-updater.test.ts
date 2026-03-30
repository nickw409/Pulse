import { describe, it, expect, vi, beforeEach } from "vitest";

const mockPipeline = {
  zincrby: vi.fn().mockReturnThis(),
  zremrangebyscore: vi.fn().mockReturnThis(),
  exec: vi.fn().mockResolvedValue([]),
};

vi.mock("./redis.js", () => ({
  redis: {
    pipeline: () => mockPipeline,
  },
}));

const { updateCounters } = await import("./redis-updater.js");

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    projectId: "proj_1",
    eventName: "page_view",
    properties: {},
    timestamp: "2026-03-01T12:00:00.000Z",
    receivedAt: "2026-03-01T12:00:01.000Z",
    ...overrides,
  };
}

describe("updateCounters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments minute, hour, and top_events counters", async () => {
    await updateCounters(makeEvent());

    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_1:counts:page_view:1m",
      1,
      expect.any(String),
    );
    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_1:counts:page_view:1h",
      1,
      expect.any(String),
    );
    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_1:top_events",
      1,
      "page_view",
    );
    expect(mockPipeline.exec).toHaveBeenCalledTimes(1);
  });

  it("floors timestamp to minute boundary for minute buckets", async () => {
    await updateCounters(makeEvent({ timestamp: "2026-03-01T12:34:56.789Z" }));

    const minuteMs = new Date("2026-03-01T12:34:00.000Z").getTime();
    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_1:counts:page_view:1m",
      1,
      String(minuteMs),
    );
  });

  it("floors timestamp to hour boundary for hour buckets", async () => {
    await updateCounters(makeEvent({ timestamp: "2026-03-01T12:34:56.789Z" }));

    const hourMs = new Date("2026-03-01T12:00:00.000Z").getTime();
    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_1:counts:page_view:1h",
      1,
      String(hourMs),
    );
  });

  it("cleans up old minute buckets outside 1-hour window", async () => {
    await updateCounters(makeEvent());

    expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
      "pulse:proj_1:counts:page_view:1m",
      "-inf",
      expect.any(Number),
    );
  });

  it("cleans up old hour buckets outside 24-hour window", async () => {
    await updateCounters(makeEvent());

    expect(mockPipeline.zremrangebyscore).toHaveBeenCalledWith(
      "pulse:proj_1:counts:page_view:1h",
      "-inf",
      expect.any(Number),
    );
  });

  it("uses correct Redis key format with projectId and eventName", async () => {
    await updateCounters(makeEvent({ projectId: "proj_abc", eventName: "purchase" }));

    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_abc:counts:purchase:1m",
      1,
      expect.any(String),
    );
    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_abc:counts:purchase:1h",
      1,
      expect.any(String),
    );
    expect(mockPipeline.zincrby).toHaveBeenCalledWith(
      "pulse:proj_abc:top_events",
      1,
      "purchase",
    );
  });
});
