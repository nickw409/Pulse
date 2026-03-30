"use client";

import { trpc } from "@/lib/trpc/client";
import { WidgetGrid } from "@/components/dashboard/widget-grid";
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
  const { data: summary } = trpc.events.summary.useQuery(
    { projectId },
    { enabled: !!project, refetchInterval: 30_000 },
  );

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
        <div className="flex items-center justify-between mt-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {project.name}
            </h1>
            <p className="mt-1 text-xs text-gray-400 font-mono">
              {project.slug}
            </p>
          </div>
          <div className="flex items-center gap-4">
            {summary && (
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-gray-900">
                  {summary.totalToday.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">events today</p>
              </div>
            )}
            <Link
              href={`/${projectId}/settings`}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Settings
            </Link>
          </div>
        </div>
      </div>

      <WidgetGrid projectId={projectId} />
    </div>
  );
}
