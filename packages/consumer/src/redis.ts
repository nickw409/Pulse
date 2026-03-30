import { Redis } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

export async function connectRedis(): Promise<void> {
  await redis.connect();
  console.log("Redis connected");
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}
