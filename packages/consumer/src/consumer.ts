import { Kafka, EachMessagePayload } from "kafkajs";
import { rawEventSchema } from "@pulse/shared/validation";
import { validateAgainstSchema } from "./schema-validator.js";
import { addEvent } from "./pg-writer.js";
import { updateCounters } from "./redis-updater.js";
import { publishNewEvent } from "./sse-publisher.js";

const kafka = new Kafka({
  clientId: "pulse-consumer",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

const consumer = kafka.consumer({ groupId: "pulse-consumer-group" });

async function handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
  if (!message.value) return;

  // 1. Parse and validate the raw message
  const parsed = rawEventSchema.safeParse(JSON.parse(message.value.toString()));
  if (!parsed.success) {
    console.error("Invalid message, skipping:", parsed.error.flatten());
    return;
  }
  const event = parsed.data;

  // 2. Validate against EventSchema (if one exists)
  const validation = await validateAgainstSchema(event);
  if (!validation.valid) {
    console.warn(`Event ${event.id} failed schema validation:`, validation.errors);
    return;
  }

  // 3. Queue for batched PG insert
  addEvent(event);

  // 4. Update Redis counters
  await updateCounters(event);

  // 5. Publish SSE notification
  await publishNewEvent(event);
}

export async function startConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: "events.raw", fromBeginning: false });

  await consumer.run({
    eachMessage: handleMessage,
  });

  console.log("Kafka consumer started, listening on events.raw");
}

export async function stopConsumer(): Promise<void> {
  await consumer.disconnect();
}
