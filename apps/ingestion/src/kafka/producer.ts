import { Kafka, Producer } from "kafkajs";

const kafka = new Kafka({
  clientId: "pulse-ingestion",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

let producer: Producer;

export async function connectProducer(): Promise<void> {
  producer = kafka.producer();
  await producer.connect();
  console.log("Kafka producer connected");
}

export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
  }
}

export async function sendEvent(
  topic: string,
  key: string,
  value: object,
): Promise<void> {
  await producer.send({
    topic,
    messages: [{ key, value: JSON.stringify(value) }],
  });
}

export async function sendEventBatch(
  topic: string,
  messages: Array<{ key: string; value: object }>,
): Promise<void> {
  await producer.send({
    topic,
    messages: messages.map((m) => ({
      key: m.key,
      value: JSON.stringify(m.value),
    })),
  });
}
