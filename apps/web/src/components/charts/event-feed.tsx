"use client";

import { useCallback, useState } from "react";
import { useSSE, type SSENewEvent } from "@/lib/sse";

type FeedItem = {
  eventName: string;
  properties: Record<string, unknown>;
  timestamp: string;
};

export function EventFeed({
  projectId,
  eventNames,
  limit,
  title,
}: {
  projectId: string;
  eventNames: string[];
  limit: number;
  title: string;
}) {
  const [events, setEvents] = useState<FeedItem[]>([]);

  const onNewEvent = useCallback(
    (event: SSENewEvent) => {
      if (eventNames.length > 0 && !eventNames.includes(event.eventName)) {
        return;
      }
      setEvents((prev) => [event, ...prev].slice(0, limit));
    },
    [eventNames, limit],
  );

  useSSE(projectId, { onNewEvent });

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5">
        {events.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            Waiting for events…
          </p>
        )}
        {events.map((ev, i) => (
          <div
            key={`${ev.timestamp}-${i}`}
            className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs animate-in fade-in slide-in-from-top-1 duration-200"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-gray-800">{ev.eventName}</span>
              <span className="text-gray-400">
                {new Date(ev.timestamp).toLocaleTimeString()}
              </span>
            </div>
            {Object.keys(ev.properties).length > 0 && (
              <pre className="text-[10px] text-gray-500 truncate">
                {JSON.stringify(ev.properties)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
