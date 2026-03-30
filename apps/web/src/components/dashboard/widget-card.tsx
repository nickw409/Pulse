"use client";

import type { Widget } from "@/server/routers/dashboard";
import { TimeSeries } from "@/components/charts/time-series";
import { LiveCounter } from "@/components/charts/live-counter";
import { EventFeed } from "@/components/charts/event-feed";
import { BarBreakdown } from "@/components/charts/bar-breakdown";

export function WidgetCard({
  widget,
  projectId,
  onRemove,
}: {
  widget: Widget;
  projectId: string;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm flex flex-col min-h-[280px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {widget.type.replace("_", " ")}
        </span>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-xs"
          title="Remove widget"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 min-h-0">
        {widget.type === "time_series" && (
          <TimeSeries
            projectId={projectId}
            eventName={widget.eventName}
            granularity={widget.granularity}
            title={widget.title}
          />
        )}
        {widget.type === "counter" && (
          <LiveCounter
            projectId={projectId}
            eventName={widget.eventName}
            window={widget.window}
            title={widget.title}
          />
        )}
        {widget.type === "event_feed" && (
          <EventFeed
            projectId={projectId}
            eventNames={widget.eventNames}
            limit={widget.limit}
            title={widget.title}
          />
        )}
        {widget.type === "bar_breakdown" && (
          <BarBreakdown
            projectId={projectId}
            eventName={widget.eventName}
            groupBy={widget.groupBy}
            title={widget.title}
          />
        )}
      </div>
    </div>
  );
}
