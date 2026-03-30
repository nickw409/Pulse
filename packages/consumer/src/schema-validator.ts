import { db } from "./db.js";
import type { ValidatedRawEvent } from "@pulse/shared/validation";
import type { EventSchemaField } from "@pulse/shared/schemas";

interface CacheEntry {
  fields: EventSchemaField[] | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();

function cacheKey(projectId: string, eventName: string): string {
  return `${projectId}:${eventName}`;
}

async function getSchemaFields(
  projectId: string,
  eventName: string,
): Promise<EventSchemaField[] | null> {
  const key = cacheKey(projectId, eventName);
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.fields;
  }

  const schema = await db.eventSchema.findUnique({
    where: { projectId_name: { projectId, name: eventName } },
  });

  const fields = schema ? (schema.fields as unknown as EventSchemaField[]) : null;
  cache.set(key, { fields, expiresAt: Date.now() + CACHE_TTL_MS });
  return fields;
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

const TYPE_CHECKERS: Record<string, (v: unknown) => boolean> = {
  string: (v) => typeof v === "string",
  number: (v) => typeof v === "number",
  boolean: (v) => typeof v === "boolean",
  object: (v) => typeof v === "object" && v !== null && !Array.isArray(v),
  array: (v) => Array.isArray(v),
};

export async function validateAgainstSchema(
  event: ValidatedRawEvent,
): Promise<ValidationResult> {
  const fields = await getSchemaFields(event.projectId, event.eventName);

  // No schema defined — event passes
  if (!fields) {
    return { valid: true };
  }

  const errors: string[] = [];

  for (const field of fields) {
    const value = event.properties[field.name];

    if (value === undefined || value === null) {
      if (field.required) {
        errors.push(`Missing required field: ${field.name}`);
      }
      continue;
    }

    const checker = TYPE_CHECKERS[field.type];
    if (checker && !checker(value)) {
      errors.push(
        `Field "${field.name}" expected type "${field.type}", got "${typeof value}"`,
      );
    }
  }

  return errors.length > 0 ? { valid: false, errors } : { valid: true };
}
