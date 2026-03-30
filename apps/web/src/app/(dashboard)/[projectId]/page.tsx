"use client";

import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { use } from "react";

export default function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = trpc.project.getById.useQuery({
    id: projectId,
  });

  if (isLoading) {
    return (
      <div className="p-8 text-sm text-gray-400">Loading project…</div>
    );
  }

  if (!project) {
    return (
      <div className="p-8">
        <p className="text-sm text-gray-500">Project not found.</p>
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          Back to projects
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href="/" className="text-sm text-gray-400 hover:text-gray-600">
          ← Projects
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {project.name}
        </h1>
        <p className="mt-1 text-xs text-gray-400 font-mono">{project.slug}</p>
      </div>
      <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center text-sm text-gray-400">
        Dashboard widgets coming in Phase 4
      </div>
    </div>
  );
}
