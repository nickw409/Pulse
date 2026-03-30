import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError, initTRPC } from "@trpc/server";

const t = initTRPC.context<{ db: any; userId: string; user: any }>().create();

// Mock trpc to avoid Clerk server-only import
vi.mock("@/server/trpc", () => {
  const t = (
    require("@trpc/server") as typeof import("@trpc/server")
  ).initTRPC
    .context<{ db: any; userId: string; user: any }>()
    .create();

  return {
    router: t.router,
    publicProcedure: t.procedure,
    protectedProcedure: t.procedure,
    createCallerFactory: t.createCallerFactory,
  };
});

// Mock Redis
const mockZrevrange = vi.fn().mockResolvedValue([]);
const mockZrangebyscore = vi.fn().mockResolvedValue([]);

vi.mock("@/server/redis", () => ({
  redis: {
    zrevrange: mockZrevrange,
    zrangebyscore: mockZrangebyscore,
  },
}));

const { eventsRouter } = await import("./events.js");

function createMockDb() {
  return {
    project: { findFirst: vi.fn() },
    event: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
  };
}

const mockUser = { id: "user_1", clerkId: "clerk_1", email: "test@test.com" };

describe("eventsRouter", () => {
  let db: ReturnType<typeof createMockDb>;
  let caller: ReturnType<ReturnType<typeof t.createCallerFactory>>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    const createCaller = t.createCallerFactory(eventsRouter);
    caller = createCaller({ db, userId: "clerk_1", user: mockUser });
    db.project.findFirst.mockResolvedValue({ id: "proj_1", userId: "user_1" });
  });

  describe("query", () => {
    it("returns events with pagination", async () => {
      const mockEvents = [
        { id: "e1", eventName: "click", timestamp: new Date(), properties: {} },
      ];
      db.event.findMany.mockResolvedValue(mockEvents);
      db.event.count.mockResolvedValue(1);

      const result = await caller.query({
        projectId: "proj_1",
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-12-31T23:59:59.000Z",
      });

      expect(result.events).toEqual(mockEvents);
      expect(result.total).toBe(1);
      expect(result.limit).toBe(100);
      expect(result.offset).toBe(0);
    });

    it("filters by eventName when provided", async () => {
      await caller.query({
        projectId: "proj_1",
        eventName: "purchase",
        startTime: "2026-01-01T00:00:00.000Z",
        endTime: "2026-12-31T23:59:59.000Z",
      });

      expect(db.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ eventName: "purchase" }),
        }),
      );
    });

    it("throws NOT_FOUND for unauthorized project", async () => {
      db.project.findFirst.mockResolvedValue(null);
      await expect(
        caller.query({
          projectId: "proj_other",
          startTime: "2026-01-01T00:00:00.000Z",
          endTime: "2026-12-31T23:59:59.000Z",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("summary", () => {
    it("returns totalToday and topEvents", async () => {
      mockZrevrange.mockResolvedValue(["page_view", "150", "click", "80"]);
      db.event.count.mockResolvedValue(230);

      const result = await caller.summary({ projectId: "proj_1" });

      expect(result.totalToday).toBe(230);
      expect(result.topEvents).toEqual([
        { name: "page_view", count: 150 },
        { name: "click", count: 80 },
      ]);
    });

    it("returns empty topEvents when Redis has no data", async () => {
      mockZrevrange.mockResolvedValue([]);
      db.event.count.mockResolvedValue(0);

      const result = await caller.summary({ projectId: "proj_1" });
      expect(result.topEvents).toEqual([]);
      expect(result.totalToday).toBe(0);
    });
  });

  describe("counters", () => {
    it("returns time-series buckets from Redis", async () => {
      mockZrangebyscore.mockResolvedValue(["1709280000", "5", "1709280060", "3"]);

      const result = await caller.counters({
        projectId: "proj_1",
        eventName: "click",
        granularity: "1m",
      });

      expect(result.buckets).toEqual([
        { timestamp: 1709280000, count: 5 },
        { timestamp: 1709280060, count: 3 },
      ]);
    });

    it("uses correct Redis key format", async () => {
      await caller.counters({
        projectId: "proj_1",
        eventName: "purchase",
        granularity: "1h",
      });

      expect(mockZrangebyscore).toHaveBeenCalledWith(
        "pulse:proj_1:counts:purchase:1h",
        "-inf",
        "+inf",
        "WITHSCORES",
      );
    });
  });
});
