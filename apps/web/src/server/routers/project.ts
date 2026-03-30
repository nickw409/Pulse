import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { slugify } from "@/lib/utils";

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.project.findMany({
      where: { userId: ctx.user.id },
      orderBy: { createdAt: "desc" },
    });
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(50) }))
    .mutation(async ({ ctx, input }) => {
      const baseSlug = slugify(input.name);
      const slug = baseSlug || "project";

      // Check for slug collision and append suffix if needed
      const existing = await ctx.db.project.findUnique({ where: { slug } });
      const finalSlug = existing
        ? `${slug}-${Math.random().toString(36).slice(2, 6)}`
        : slug;

      return ctx.db.project.create({
        data: {
          name: input.name,
          slug: finalSlug,
          userId: ctx.user.id,
        },
      });
    }),

  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { slug: input.slug, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return project;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.id, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return project;
    }),
});
