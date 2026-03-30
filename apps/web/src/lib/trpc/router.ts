import { router } from "@/server/trpc";
import { projectRouter } from "@/server/routers/project";
import { apiKeyRouter } from "@/server/routers/apiKey";

export const appRouter = router({
  project: projectRouter,
  apiKey: apiKeyRouter,
});

export type AppRouter = typeof appRouter;
