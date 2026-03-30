"use client";

import { trpc } from "@/lib/trpc/client";
import { SchemaEditor } from "@/components/schemas/schema-editor";
import Link from "next/link";
import { use } from "react";

export default function SchemasPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project, isLoading } = trpc.project.getById.useQuery({
    id: projectId,
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-gray-400">Loading…</div>;
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
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link
          href={`/${projectId}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Event Schemas
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Define expected fields for your events. The consumer validates
          incoming events against these schemas.
        </p>
      </div>

      <SchemaEditor projectId={projectId} />
    </div>
  );
}
