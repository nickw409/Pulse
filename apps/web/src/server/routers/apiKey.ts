import { z } from "zod";
import crypto from "node:crypto";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

function generateApiKey(): string {
  return `pk_${crypto.randomBytes(24).toString("hex")}`;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export const apiKeyRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the user owns this project
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.apiKey.findMany({
        where: { projectId: input.projectId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          lastUsedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(50),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const rawKey = generateApiKey();
      const keyHash = hashKey(rawKey);
      const keyPrefix = rawKey.slice(0, 11); // "pk_" + first 8 hex chars

      const apiKey = await ctx.db.apiKey.create({
        data: {
          name: input.name,
          keyHash,
          keyPrefix,
          projectId: input.projectId,
        },
      });

      // Return the full key only on creation — it can never be retrieved again
      return {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        key: rawKey,
        createdAt: apiKey.createdAt,
      };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const apiKey = await ctx.db.apiKey.findFirst({
        where: { id: input.id, projectId: input.projectId },
      });
      if (!apiKey) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.apiKey.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
