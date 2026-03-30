import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export type Widget =
  | {
      type: "time_series";
      eventName: string;
      granularity: "1m" | "1h";
      title: string;
    }
  | {
      type: "counter";
      eventName: string;
      window: "1h" | "24h";
      title: string;
    }
  | {
      type: "bar_breakdown";
      eventName: string;
      groupBy: string;
      title: string;
    }
  | {
      type: "event_feed";
      eventNames: string[];
      limit: number;
      title: string;
    };

export const dashboardRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      let dashboard = await ctx.db.dashboard.findFirst({
        where: { projectId: input.projectId },
      });

      if (!dashboard) {
        dashboard = await ctx.db.dashboard.create({
          data: {
            name: "Default",
            projectId: input.projectId,
            widgets: [],
          },
        });
      }

      return dashboard;
    }),

  update: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        widgets: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db.project.findFirst({
        where: { id: input.projectId, userId: ctx.user.id },
      });
      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const widgetsJson = JSON.parse(input.widgets) as Prisma.InputJsonValue;

      const dashboard = await ctx.db.dashboard.findFirst({
        where: { projectId: input.projectId },
      });

      if (dashboard) {
        return ctx.db.dashboard.update({
          where: { id: dashboard.id },
          data: { widgets: widgetsJson },
        });
      }

      return ctx.db.dashboard.create({
        data: {
          name: "Default",
          projectId: input.projectId,
          widgets: widgetsJson,
        },
      });
    }),
});
