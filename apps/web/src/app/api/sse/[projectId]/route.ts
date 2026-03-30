import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { userId } = await auth();
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { projectId } = await params;

  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const project = await db.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) {
    return new Response("Not found", { status: 404 });
  }

  const channel = `pulse:sse:${projectId}`;
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const sub = new Redis(redisUrl, { maxRetriesPerRequest: null });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      // Send heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30_000);

      sub.subscribe(channel).catch(() => {
        controller.close();
      });

      sub.on("message", (_ch: string, message: string) => {
        try {
          const parsed = JSON.parse(message);
          send(parsed.type, JSON.stringify(parsed.data));
        } catch {
          // skip malformed messages
        }
      });

      // Cleanup when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        sub.unsubscribe(channel).catch(() => {});
        sub.disconnect();
      });
    },
    cancel() {
      sub.unsubscribe(channel).catch(() => {});
      sub.disconnect();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
