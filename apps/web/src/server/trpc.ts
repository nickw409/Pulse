import { initTRPC, TRPCError } from "@trpc/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "./db";

export const createTRPCContext = async () => {
  const { userId } = await auth();
  return { userId, db };
};

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  const user = await ctx.db.user.upsert({
    where: { clerkId: ctx.userId },
    update: {},
    create: {
      clerkId: ctx.userId,
      email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
    },
  });

  return next({ ctx: { ...ctx, userId: ctx.userId, user } });
});
