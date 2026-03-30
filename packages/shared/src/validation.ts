import { z } from "zod";

export const ingestEventSchema = z.object({
  name: z.string().min(1).max(256),
  properties: z.record(z.unknown()).default({}),
  timestamp: z.string().datetime().optional(),
});

export const ingestBatchSchema = z.object({
  events: z.array(ingestEventSchema).min(1).max(100),
});

export const rawEventSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().min(1),
  eventName: z.string().min(1).max(256),
  properties: z.record(z.unknown()),
  timestamp: z.string().datetime(),
  receivedAt: z.string().datetime(),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;
export type IngestBatch = z.infer<typeof ingestBatchSchema>;
export type ValidatedRawEvent = z.infer<typeof rawEventSchema>;
