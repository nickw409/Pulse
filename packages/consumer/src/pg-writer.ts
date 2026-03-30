import { db } from "./db.js";
import type { Prisma } from "@prisma/client";
import type { ValidatedRawEvent } from "@pulse/shared/validation";

const BATCH_SIZE = 100;
const FLUSH_INTERVAL_MS = 5_000;

let buffer: ValidatedRawEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startWriter(): void {
  flushTimer = setInterval(() => {
    flush().catch((err) => console.error("Periodic flush failed:", err));
  }, FLUSH_INTERVAL_MS);
}

export async function stopWriter(): Promise<void> {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flush();
}

export function addEvent(event: ValidatedRawEvent): void {
  buffer.push(event);
  if (buffer.length >= BATCH_SIZE) {
    flush().catch((err) => console.error("Batch flush failed:", err));
  }
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;

  const batch = buffer;
  buffer = [];

  try {
    await db.event.createMany({
      data: batch.map((e) => ({
        id: e.id,
        eventName: e.eventName,
        properties: e.properties as Prisma.InputJsonValue,
        timestamp: new Date(e.timestamp),
        projectId: e.projectId,
      })),
      skipDuplicates: true,
    });
    console.log(`Flushed ${batch.length} events to PG`);
  } catch (err) {
    console.error(`Failed to flush ${batch.length} events:`, err);
  }
}
