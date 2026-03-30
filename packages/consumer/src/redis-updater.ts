import { redis } from "./redis.js";
import type { ValidatedRawEvent } from "@pulse/shared/validation";

function floorToMinute(isoTimestamp: string): number {
  const ms = new Date(isoTimestamp).getTime();
  return Math.floor(ms / 60_000) * 60_000;
}

function floorToHour(isoTimestamp: string): number {
  const ms = new Date(isoTimestamp).getTime();
  return Math.floor(ms / 3_600_000) * 3_600_000;
}

const ONE_HOUR_MS = 3_600_000;
const TWENTY_FOUR_HOURS_MS = 24 * ONE_HOUR_MS;

export async function updateCounters(event: ValidatedRawEvent): Promise<void> {
  const { projectId, eventName, timestamp } = event;
  const now = Date.now();

  const minuteBucket = floorToMinute(timestamp);
  const hourBucket = floorToHour(timestamp);

  const minuteKey = `pulse:${projectId}:counts:${eventName}:1m`;
  const hourKey = `pulse:${projectId}:counts:${eventName}:1h`;
  const topKey = `pulse:${projectId}:top_events`;

  const pipeline = redis.pipeline();

  // 1-minute buckets (sliding window: last 60 minutes)
  pipeline.zincrby(minuteKey, 1, String(minuteBucket));
  pipeline.zremrangebyscore(minuteKey, "-inf", now - ONE_HOUR_MS);

  // 1-hour buckets (sliding window: last 24 hours)
  pipeline.zincrby(hourKey, 1, String(hourBucket));
  pipeline.zremrangebyscore(hourKey, "-inf", now - TWENTY_FOUR_HOURS_MS);

  // Top events
  pipeline.zincrby(topKey, 1, eventName);

  await pipeline.exec();
}
