import { redis } from "./redis.js";
import type { ValidatedRawEvent } from "@pulse/shared/validation";

export async function publishNewEvent(event: ValidatedRawEvent): Promise<void> {
  const channel = `pulse:sse:${event.projectId}`;
  const payload = JSON.stringify({
    type: "new_event",
    data: {
      eventName: event.eventName,
      properties: event.properties,
      timestamp: event.timestamp,
    },
  });
  await redis.publish(channel, payload);
}

export async function publishCounterUpdate(
  projectId: string,
  eventName: string,
  counts: { "1m": number; "1h": number },
): Promise<void> {
  const channel = `pulse:sse:${projectId}`;
  const payload = JSON.stringify({
    type: "counter_update",
    data: { eventName, counts },
  });
  await redis.publish(channel, payload);
}
