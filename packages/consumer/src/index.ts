import { startConsumer, stopConsumer } from "./consumer.js";
import { connectRedis, disconnectRedis } from "./redis.js";
import { startWriter, stopWriter } from "./pg-writer.js";
import { db } from "./db.js";

console.log("Consumer worker starting...");

async function start(): Promise<void> {
  await connectRedis();
  startWriter();
  await startConsumer();
}

start().catch((err) => {
  console.error("Failed to start consumer:", err);
  process.exit(1);
});

const shutdown = async () => {
  console.log("Shutting down consumer...");
  await stopConsumer();
  await stopWriter();
  await disconnectRedis();
  await db.$disconnect();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
