import { startConsumer, stopConsumer } from "./consumer.js";

console.log("Consumer worker starting...");

startConsumer().catch((err) => {
  console.error("Failed to start consumer:", err);
  process.exit(1);
});

const shutdown = async () => {
  console.log("Shutting down consumer...");
  await stopConsumer();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
