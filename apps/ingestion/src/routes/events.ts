import { Router } from "express";
import crypto from "node:crypto";
import { ingestEventSchema, ingestBatchSchema } from "@pulse/shared/validation";
import { RawEvent } from "@pulse/shared/events";
import { sendEvent, sendEventBatch } from "../kafka/producer.js";
import { AuthenticatedRequest } from "../auth/api-key.js";

const TOPIC = "events.raw";

const router = Router();

router.post("/v1/events", async (req: AuthenticatedRequest, res) => {
  const parsed = ingestEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const { name, properties, timestamp } = parsed.data;
  const projectId = req.projectId!;
  const now = new Date().toISOString();

  const event: RawEvent = {
    id: crypto.randomUUID(),
    projectId,
    eventName: name,
    properties,
    timestamp: timestamp ?? now,
    receivedAt: now,
  };

  await sendEvent(TOPIC, projectId, event);
  res.status(202).json({ accepted: true, eventId: event.id });
});

router.post("/v1/events/batch", async (req: AuthenticatedRequest, res) => {
  const parsed = ingestBatchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const projectId = req.projectId!;
  const now = new Date().toISOString();

  const events: RawEvent[] = parsed.data.events.map((e) => ({
    id: crypto.randomUUID(),
    projectId,
    eventName: e.name,
    properties: e.properties,
    timestamp: e.timestamp ?? now,
    receivedAt: now,
  }));

  await sendEventBatch(
    TOPIC,
    events.map((e) => ({ key: projectId, value: e })),
  );

  res.status(202).json({
    accepted: true,
    count: events.length,
    eventIds: events.map((e) => e.id),
  });
});

export default router;
