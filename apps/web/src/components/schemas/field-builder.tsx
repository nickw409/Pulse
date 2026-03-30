"use client";

import { useState } from "react";

export interface SchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description?: string;
}

const FIELD_TYPES: SchemaField["type"][] = [
  "string",
  "number",
  "boolean",
  "object",
  "array",
];

export function FieldBuilder({
  fields,
  onChange,
  disabled,
}: {
  fields: SchemaField[];
  onChange: (fields: SchemaField[]) => void;
  disabled?: boolean;
}) {
  const addField = () => {
    onChange([
      ...fields,
      { name: "", type: "string", required: false },
    ]);
  };

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    onChange(
      fields.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    );
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {fields.map((field, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3"
        >
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              type="text"
              value={field.name}
              onChange={(e) => updateField(i, { name: e.target.value })}
              placeholder="Field name"
              disabled={disabled}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
            />
            <select
              value={field.type}
              onChange={(e) =>
                updateField(i, { type: e.target.value as SchemaField["type"] })
              }
              disabled={disabled}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={field.description ?? ""}
              onChange={(e) => updateField(i, { description: e.target.value })}
              placeholder="Description (optional)"
              disabled={disabled}
              className="col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100"
            />
          </div>
          <div className="flex flex-col items-center gap-1 pt-1">
            <label className="flex items-center gap-1 text-xs text-gray-500">
              <input
                type="checkbox"
                checked={field.required}
                onChange={(e) => updateField(i, { required: e.target.checked })}
                disabled={disabled}
                className="rounded"
              />
              Req
            </label>
            {!disabled && (
              <button
                onClick={() => removeField(i)}
                className="text-xs text-gray-400 hover:text-red-500"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      ))}
      {!disabled && (
        <button
          onClick={addField}
          className="rounded-md border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 w-full"
        >
          + Add field
        </button>
      )}
    </div>
  );
}
