"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { use, useState } from "react";

export default function SettingsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project } = trpc.project.getById.useQuery({ id: projectId });
  const { data: apiKeys, refetch } = trpc.apiKey.list.useQuery({ projectId });
  const createKey = trpc.apiKey.create.useMutation({ onSuccess: () => refetch() });
  const revokeKey = trpc.apiKey.revoke.useMutation({ onSuccess: () => refetch() });

  const [keyName, setKeyName] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyName.trim()) return;
    const result = await createKey.mutateAsync({ projectId, name: keyName.trim() });
    setNewKey(result.key);
    setKeyName("");
  };

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href={`/${projectId}`}
        className="text-sm text-gray-400 hover:text-gray-600"
      >
        ← Dashboard
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">
        {project?.name ?? "..."} Settings
      </h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-gray-800">API Keys</h2>
        <p className="mt-1 text-sm text-gray-500">
          Use API keys to send events to the ingestion service.
        </p>

        {newKey && (
          <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-4">
            <p className="text-sm font-medium text-green-800">
              Key created! Copy it now — it won't be shown again.
            </p>
            <code className="mt-2 block break-all rounded bg-white p-2 text-xs font-mono text-green-900 border border-green-200">
              {newKey}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(newKey);
              }}
              className="mt-2 text-xs text-green-700 hover:text-green-900 underline"
            >
              Copy to clipboard
            </button>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 ml-4 text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <form onSubmit={handleCreate} className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Key name (e.g. production)"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
          <button
            type="submit"
            disabled={createKey.isPending || !keyName.trim()}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {createKey.isPending ? "Creating..." : "Create Key"}
          </button>
        </form>

        <div className="mt-6 space-y-3">
          {apiKeys?.length === 0 && (
            <p className="text-sm text-gray-400">No API keys yet.</p>
          )}
          {apiKeys?.map((k) => (
            <div
              key={k.id}
              className="flex items-center justify-between rounded-md border border-gray-200 bg-white p-3"
            >
              <div>
                <span className="text-sm font-medium text-gray-800">
                  {k.name}
                </span>
                <span className="ml-2 text-xs font-mono text-gray-400">
                  {k.keyPrefix}...
                </span>
                {k.lastUsedAt && (
                  <span className="ml-2 text-xs text-gray-400">
                    Last used{" "}
                    {new Date(k.lastUsedAt).toLocaleDateString()}
                  </span>
                )}
              </div>
              <button
                onClick={() => revokeKey.mutate({ id: k.id, projectId })}
                disabled={revokeKey.isPending}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Revoke
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10 rounded-md border border-gray-200 bg-gray-50 p-4">
        <h3 className="text-sm font-semibold text-gray-700">Usage Example</h3>
        <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-gray-100">
{`curl -X POST http://localhost:3001/v1/events \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"name": "page_view", "properties": {"path": "/home"}}'`}
        </pre>
      </section>
    </div>
  );
}
