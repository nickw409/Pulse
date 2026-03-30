import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const fieldSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["string", "number", "boolean", "object", "array"]),
  required: z.boolean(),
  description: z.string().optional(),
});

export const schemaRouter = router({
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.eventSchema.findMany({
        where: { projectId: input.projectId },
        orderBy: { name: "asc" },
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        name: z.string().min(1).max(256),
        fields: z.array(fieldSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const existing = await ctx.db.eventSchema.findUnique({
        where: { projectId_name: { projectId: input.projectId, name: input.name } },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Schema "${input.name}" already exists`,
        });
      }

      return ctx.db.eventSchema.create({
        data: {
          name: input.name,
          fields: input.fields,
          projectId: input.projectId,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        projectId: z.string(),
        fields: z.array(fieldSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const schema = await ctx.db.eventSchema.findFirst({
        where: { id: input.id, projectId: input.projectId },
      });
      if (!schema) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.db.eventSchema.update({
        where: { id: input.id },
        data: {
          fields: input.fields,
          version: { increment: 1 },
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string(), projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.db.eventSchema.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
