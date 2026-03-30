"use client";

import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useSSE, type SSECounterUpdate } from "@/lib/sse";

export function LiveCounter({
  projectId,
  eventName,
  window: timeWindow,
  title,
}: {
  projectId: string;
  eventName: string;
  window: "1h" | "24h";
  title: string;
}) {
  const granularity = timeWindow === "1h" ? "1m" : "1h";
  const { data } = trpc.events.counters.useQuery(
    { projectId, eventName, granularity },
    { refetchInterval: 60_000 },
  );

  const [liveIncrement, setLiveIncrement] = useState(0);

  const onCounterUpdate = useCallback(
    (update: SSECounterUpdate) => {
      if (update.eventName !== eventName) return;
      setLiveIncrement((prev) => prev + update.counts[granularity]);
    },
    [eventName, granularity],
  );

  useSSE(projectId, { onCounterUpdate });

  // Sum all buckets in window
  const now = Math.floor(Date.now() / 1000);
  const windowSeconds = timeWindow === "1h" ? 3600 : 86400;
  const cutoff = now - windowSeconds;
  const total =
    (data?.buckets ?? [])
      .filter((b) => b.timestamp >= cutoff)
      .reduce((sum, b) => sum + b.count, 0) + liveIncrement;

  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-4xl font-bold tabular-nums text-gray-900">
        {total.toLocaleString()}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        last {timeWindow === "1h" ? "hour" : "24 hours"}
      </p>
    </div>
  );
}
