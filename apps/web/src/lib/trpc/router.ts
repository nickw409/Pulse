import { router } from "@/server/trpc";
import { projectRouter } from "@/server/routers/project";
import { apiKeyRouter } from "@/server/routers/apiKey";
import { eventsRouter } from "@/server/routers/events";
import { dashboardRouter } from "@/server/routers/dashboard";

export const appRouter = router({
  project: projectRouter,
  apiKey: apiKeyRouter,
  events: eventsRouter,
  dashboard: dashboardRouter,
});

export type AppRouter = typeof appRouter;
