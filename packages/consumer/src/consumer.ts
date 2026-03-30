import { Kafka, EachMessagePayload } from "kafkajs";
import { RawEvent } from "@pulse/shared/events";

const kafka = new Kafka({
  clientId: "pulse-consumer",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

const consumer = kafka.consumer({ groupId: "pulse-consumer-group" });

async function handleMessage({ topic, partition, message }: EachMessagePayload): Promise<void> {
  if (!message.value) return;

  const event: RawEvent = JSON.parse(message.value.toString());
  console.log(
    `[${topic}:${partition}] event=${event.eventName} project=${event.projectId} id=${event.id}`,
  );
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
