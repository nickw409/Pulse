"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { FieldBuilder, type SchemaField } from "./field-builder";

export function SchemaEditor({ projectId }: { projectId: string }) {
  const { data: schemas, isLoading, refetch } = trpc.schema.list.useQuery({
    projectId,
  });

  const createMutation = trpc.schema.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewName("");
      setNewFields([{ name: "", type: "string", required: false }]);
      setShowCreate(false);
    },
  });

  const updateMutation = trpc.schema.update.useMutation({
    onSuccess: () => refetch(),
  });

  const deleteMutation = trpc.schema.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFields, setNewFields] = useState<SchemaField[]>([
    { name: "", type: "string", required: false },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<SchemaField[]>([]);

  const handleCreate = () => {
    const validFields = newFields.filter((f) => f.name.trim());
    if (!newName.trim() || validFields.length === 0) return;
    createMutation.mutate({
      projectId,
      name: newName.trim(),
      fields: validFields,
    });
  };

  const startEdit = (schema: { id: string; fields: unknown }) => {
    setEditingId(schema.id);
    setEditFields(schema.fields as SchemaField[]);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    const validFields = editFields.filter((f) => f.name.trim());
    if (validFields.length === 0) return;
    updateMutation.mutate(
      { id: editingId, projectId, fields: validFields },
      { onSuccess: () => setEditingId(null) },
    );
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading schemas…</div>;
  }

  return (
    <div className="space-y-6">
      {/* Existing schemas */}
      {schemas?.map((schema) => (
        <div
          key={schema.id}
          className="rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {schema.name}
              </h3>
              <p className="text-xs text-gray-400">
                v{schema.version}
              </p>
            </div>
            <div className="flex gap-2">
              {editingId === schema.id ? (
                <>
                  <button
                    onClick={handleUpdate}
                    disabled={updateMutation.isPending}
                    className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(schema)}
                    className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      deleteMutation.mutate({ id: schema.id, projectId })
                    }
                    className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
          <FieldBuilder
            fields={
              editingId === schema.id
                ? editFields
                : (schema.fields as unknown as SchemaField[])
            }
            onChange={setEditFields}
            disabled={editingId !== schema.id}
          />
        </div>
      ))}

      {/* Create new schema */}
      {showCreate ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50/30 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            New Event Schema
          </h3>
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Event name
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. purchase, page_view"
              className="w-full max-w-xs rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Fields
          </label>
          <FieldBuilder fields={newFields} onChange={setNewFields} />
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Create schema
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-md border border-dashed border-gray-300 px-4 py-2 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700"
        >
          + New event schema
        </button>
      )}
    </div>
  );
}
