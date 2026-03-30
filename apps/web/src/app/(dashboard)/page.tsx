"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";

export default function ProjectsPage() {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");

  const { data: projects, isLoading } = trpc.project.list.useQuery();
  const utils = trpc.useUtils();

  const create = trpc.project.create.useMutation({
    onSuccess: () => {
      void utils.project.list.invalidate();
      setName("");
      setShowForm(false);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate({ name: name.trim() });
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="mt-1 text-sm text-gray-500">
            Select a project to view its dashboard, or create a new one.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          New project
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 p-4 bg-white border border-gray-200 rounded-lg flex items-center gap-3"
        >
          <input
            autoFocus
            type="text"
            placeholder="Project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
          <button
            type="submit"
            disabled={create.isPending}
            className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {create.isPending ? "Creating…" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowForm(false);
              setName("");
            }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </form>
      )}

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">
          No projects yet. Create one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => (
            <Link
              key={project.id}
              href={`/${project.id}`}
              className="block p-5 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all"
            >
              <h2 className="font-semibold text-gray-900">{project.name}</h2>
              <p className="mt-1 text-xs text-gray-400 font-mono">
                {project.slug}
              </p>
              <p className="mt-3 text-xs text-gray-400">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
