import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError, initTRPC } from "@trpc/server";

const t = initTRPC.context<{ db: any; userId: string; user: any }>().create();

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

const { schemaRouter } = await import("./schema.js");

function createMockDb() {
  return {
    project: { findFirst: vi.fn() },
    eventSchema: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };
}

const mockUser = { id: "user_1", clerkId: "clerk_1", email: "test@test.com" };

describe("schemaRouter", () => {
  let db: ReturnType<typeof createMockDb>;
  let caller: ReturnType<ReturnType<typeof t.createCallerFactory>>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    const createCaller = t.createCallerFactory(schemaRouter as any);
    caller = createCaller({ db, userId: "clerk_1", user: mockUser });
    db.project.findFirst.mockResolvedValue({ id: "proj_1", userId: "user_1" });
  });

  describe("list", () => {
    it("returns schemas for a project", async () => {
      const schemas = [
        { id: "s1", name: "purchase", version: 1, fields: [], projectId: "proj_1" },
      ];
      db.eventSchema.findMany.mockResolvedValue(schemas);

      const result = await (caller as any).list({ projectId: "proj_1" });
      expect(result).toEqual(schemas);
    });

    it("throws NOT_FOUND for non-existent project", async () => {
      db.project.findFirst.mockResolvedValue(null);
      await expect(
        (caller as any).list({ projectId: "proj_missing" }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("create", () => {
    it("creates a new schema", async () => {
      db.eventSchema.findUnique.mockResolvedValue(null);
      const created = { id: "s_new", name: "click", version: 1, fields: [] };
      db.eventSchema.create.mockResolvedValue(created);

      const result = await (caller as any).create({
        projectId: "proj_1",
        name: "click",
        fields: [{ name: "target", type: "string", required: true }],
      });

      expect(result).toEqual(created);
      expect(db.eventSchema.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "click", projectId: "proj_1" }),
      });
    });

    it("rejects duplicate schema name", async () => {
      db.eventSchema.findUnique.mockResolvedValue({ id: "existing" });

      await expect(
        (caller as any).create({
          projectId: "proj_1",
          name: "purchase",
          fields: [{ name: "amount", type: "number", required: true }],
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("update", () => {
    it("increments version on update", async () => {
      db.eventSchema.findFirst.mockResolvedValue({ id: "s1", projectId: "proj_1" });
      db.eventSchema.update.mockResolvedValue({ id: "s1", version: 2 });

      await (caller as any).update({
        id: "s1",
        projectId: "proj_1",
        fields: [{ name: "amount", type: "number", required: true }],
      });

      expect(db.eventSchema.update).toHaveBeenCalledWith({
        where: { id: "s1" },
        data: {
          fields: expect.any(Array),
          version: { increment: 1 },
        },
      });
    });

    it("throws NOT_FOUND for non-existent schema", async () => {
      db.eventSchema.findFirst.mockResolvedValue(null);

      await expect(
        (caller as any).update({
          id: "s_missing",
          projectId: "proj_1",
          fields: [{ name: "x", type: "string", required: false }],
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("deletes a schema", async () => {
      db.eventSchema.delete.mockResolvedValue({});

      const result = await (caller as any).delete({ id: "s1", projectId: "proj_1" });
      expect(result).toEqual({ success: true });
      expect(db.eventSchema.delete).toHaveBeenCalledWith({ where: { id: "s1" } });
    });
  });
});
