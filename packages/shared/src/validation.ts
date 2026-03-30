import { z } from "zod";

export const ingestEventSchema = z.object({
  name: z.string().min(1).max(256),
  properties: z.record(z.unknown()).default({}),
  timestamp: z.string().datetime().optional(),
});

export const ingestBatchSchema = z.object({
  events: z.array(ingestEventSchema).min(1).max(100),
});

export type IngestEvent = z.infer<typeof ingestEventSchema>;
export type IngestBatch = z.infer<typeof ingestBatchSchema>;
