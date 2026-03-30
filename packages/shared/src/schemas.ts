export interface EventSchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description?: string;
}

export interface EventSchemaDefinition {
  id: string;
  name: string;
  version: number;
  fields: EventSchemaField[];
  projectId: string;
}
