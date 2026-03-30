import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { redis } from "../redis";

export const eventsRouter = router({
  query: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventName: z.string().optional(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const where = {
        projectId: input.projectId,
        timestamp: {
          gte: new Date(input.startTime),
          lte: new Date(input.endTime),
        },
        ...(input.eventName && { eventName: input.eventName }),
      };

      const [events, total] = await Promise.all([
        ctx.db.event.findMany({
          where,
          orderBy: { timestamp: "desc" },
          take: input.limit,
          skip: input.offset,
        }),
        ctx.db.event.count({ where }),
      ]);

      return { events, total, limit: input.limit, offset: input.offset };
    }),

  summary: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Top events from Redis
      const topEventsRaw = await redis.zrevrange(
        `pulse:${input.projectId}:top_events`,
        0,
        9,
        "WITHSCORES",
      );

      const topEvents: { name: string; count: number }[] = [];
      for (let i = 0; i < topEventsRaw.length; i += 2) {
        topEvents.push({
          name: topEventsRaw[i],
          count: parseInt(topEventsRaw[i + 1], 10),
        });
      }

      // Total events today from PG
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const totalToday = await ctx.db.event.count({
        where: { projectId: input.projectId, timestamp: { gte: todayStart } },
      });

      return { totalToday, topEvents };
    }),

  counters: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventName: z.string(),
        granularity: z.enum(["1m", "1h"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const key = `pulse:${input.projectId}:counts:${input.eventName}:${input.granularity}`;
      const raw = await redis.zrangebyscore(key, "-inf", "+inf", "WITHSCORES");

      const buckets: { timestamp: number; count: number }[] = [];
      for (let i = 0; i < raw.length; i += 2) {
        buckets.push({
          timestamp: parseInt(raw[i], 10),
          count: parseInt(raw[i + 1], 10),
        });
      }

      return { buckets };
    }),

  breakdown: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        eventName: z.string(),
        groupBy: z.string(),
        startTime: z.string().datetime(),
        endTime: z.string().datetime(),
        limit: z.number().min(1).max(50).default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const events = await ctx.db.event.findMany({
        where: {
          projectId: input.projectId,
          eventName: input.eventName,
          timestamp: {
            gte: new Date(input.startTime),
            lte: new Date(input.endTime),
          },
        },
        select: { properties: true },
      });

      // Group by the property key
      const counts = new Map<string, number>();
      for (const e of events) {
        const props = e.properties as Record<string, unknown>;
        const val = String(props[input.groupBy] ?? "unknown");
        counts.set(val, (counts.get(val) ?? 0) + 1);
      }

      const groups = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, input.limit)
        .map(([value, count]) => ({ value, count }));

      return { groups };
    }),
});
