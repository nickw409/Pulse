"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import type { Widget } from "@/server/routers/dashboard";
import { WidgetCard } from "./widget-card";
import { AddWidgetModal } from "./add-widget-modal";

export function WidgetGrid({ projectId }: { projectId: string }) {
  const dashboardQuery = trpc.dashboard.get.useQuery({ projectId });
  const updateMutation = trpc.dashboard.update.useMutation();
  const [showAdd, setShowAdd] = useState(false);

  const dashboard: { widgets: unknown } | undefined = dashboardQuery.data;
  const widgets = (Array.isArray(dashboard?.widgets) ? dashboard.widgets : []) as Widget[];

  const saveWidgets = useCallback(
    (next: Widget[]) => {
      updateMutation.mutate(
        { projectId, widgets: JSON.stringify(next) },
        { onSuccess: () => void dashboardQuery.refetch() },
      );
    },
    [projectId, updateMutation, dashboardQuery],
  );

  const removeWidget = (index: number) => {
    saveWidgets(widgets.filter((_, i) => i !== index));
  };

  const addWidget = (widget: Widget) => {
    saveWidgets([...widgets, widget]);
    setShowAdd(false);
  };

  if (dashboardQuery.isLoading) {
    return (
      <div className="text-sm text-gray-400 py-8 text-center">
        Loading dashboard…
      </div>
    );
  }

  return (
    <div>
      {widgets.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-12 text-center">
          <p className="text-sm text-gray-400 mb-3">
            No widgets yet. Add one to start monitoring events.
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Add widget
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {widgets.map((w, i) => (
              <WidgetCard
                key={`${w.type}-${w.title}-${i}`}
                widget={w}
                projectId={projectId}
                onRemove={() => removeWidget(i)}
              />
            ))}
          </div>
          <div className="mt-4">
            <button
              onClick={() => setShowAdd(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              + Add widget
            </button>
          </div>
        </>
      )}

      {showAdd && (
        <AddWidgetModal
          onAdd={addWidget}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
