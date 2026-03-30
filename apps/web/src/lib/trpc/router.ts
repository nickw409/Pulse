import { router } from "@/server/trpc";
import { projectRouter } from "@/server/routers/project";
import { apiKeyRouter } from "@/server/routers/apiKey";
import { eventsRouter } from "@/server/routers/events";
import { dashboardRouter } from "@/server/routers/dashboard";
import { schemaRouter } from "@/server/routers/schema";

export const appRouter = router({
  project: projectRouter,
  apiKey: apiKeyRouter,
  events: eventsRouter,
  dashboard: dashboardRouter,
  schema: schemaRouter,
});

export type AppRouter = typeof appRouter;
