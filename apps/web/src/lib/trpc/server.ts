import { createCallerFactory } from "@/server/trpc";
import { appRouter } from "./router";
import { createTRPCContext } from "@/server/trpc";

const createCaller = createCallerFactory(appRouter);

export const createServerCaller = async () => {
  const ctx = await createTRPCContext();
  return createCaller(ctx);
};
