import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError, initTRPC } from "@trpc/server";

// Build a standalone test router that doesn't import Clerk
const t = initTRPC.context<{ db: any; userId: string; user: any }>().create();

// Mock the trpc module to avoid Clerk server-only import
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

vi.mock("@prisma/client", () => ({
  Prisma: {},
}));

// Now import after mocks are set up
const { dashboardRouter } = await import("./dashboard.js");

function createMockDb() {
  return {
    project: { findFirst: vi.fn() },
    dashboard: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  };
}

const mockUser = { id: "user_1", clerkId: "clerk_1", email: "test@test.com" };

describe("dashboardRouter", () => {
  let db: ReturnType<typeof createMockDb>;
  let caller: ReturnType<ReturnType<typeof t.createCallerFactory>>;

  beforeEach(() => {
    db = createMockDb();
    const createCaller = t.createCallerFactory(dashboardRouter);
    caller = createCaller({ db, userId: "clerk_1", user: mockUser });
    db.project.findFirst.mockResolvedValue({
      id: "proj_1",
      userId: "user_1",
      name: "Test",
      slug: "test",
    });
  });

  describe("get", () => {
    it("returns existing dashboard", async () => {
      const dashboard = {
        id: "dash_1",
        name: "Default",
        projectId: "proj_1",
        widgets: [{ type: "counter", eventName: "click", window: "1h", title: "Clicks" }],
      };
      db.dashboard.findFirst.mockResolvedValue(dashboard);

      const result = await caller.get({ projectId: "proj_1" });
      expect(result).toEqual(dashboard);
    });

    it("creates a default dashboard if none exists", async () => {
      db.dashboard.findFirst.mockResolvedValue(null);
      const created = { id: "dash_new", name: "Default", projectId: "proj_1", widgets: [] };
      db.dashboard.create.mockResolvedValue(created);

      const result = await caller.get({ projectId: "proj_1" });
      expect(result).toEqual(created);
      expect(db.dashboard.create).toHaveBeenCalledWith({
        data: { name: "Default", projectId: "proj_1", widgets: [] },
      });
    });

    it("throws NOT_FOUND for non-existent project", async () => {
      db.project.findFirst.mockResolvedValue(null);
      await expect(caller.get({ projectId: "proj_missing" })).rejects.toThrow(TRPCError);
    });
  });

  describe("update", () => {
    it("updates widgets on existing dashboard", async () => {
      const existingDash = { id: "dash_1", projectId: "proj_1" };
      db.dashboard.findFirst.mockResolvedValue(existingDash);
      db.dashboard.update.mockResolvedValue({ ...existingDash, widgets: [] });

      const widgets = JSON.stringify([
        { type: "counter", eventName: "click", window: "1h", title: "Clicks" },
      ]);
      await caller.update({ projectId: "proj_1", widgets });

      expect(db.dashboard.update).toHaveBeenCalledWith({
        where: { id: "dash_1" },
        data: { widgets: expect.any(Array) },
      });
    });

    it("creates dashboard on update if none exists", async () => {
      db.dashboard.findFirst.mockResolvedValue(null);
      db.dashboard.create.mockResolvedValue({ id: "dash_new", projectId: "proj_1", widgets: [] });

      await caller.update({ projectId: "proj_1", widgets: "[]" });
      expect(db.dashboard.create).toHaveBeenCalled();
    });

    it("throws NOT_FOUND when project doesn't belong to user", async () => {
      db.project.findFirst.mockResolvedValue(null);
      await expect(
        caller.update({ projectId: "proj_other", widgets: "[]" }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
