"use client";

import { useCallback, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";
import { useSSE, type SSECounterUpdate } from "@/lib/sse";

type Bucket = { timestamp: number; count: number };

export function TimeSeries({
  projectId,
  eventName,
  granularity,
  title,
}: {
  projectId: string;
  eventName: string;
  granularity: "1m" | "1h";
  title: string;
}) {
  const { data, refetch } = trpc.events.counters.useQuery(
    { projectId, eventName, granularity },
    { refetchInterval: 60_000 },
  );

  const [liveBuckets, setLiveBuckets] = useState<Bucket[]>([]);

  const onCounterUpdate = useCallback(
    (update: SSECounterUpdate) => {
      if (update.eventName !== eventName) return;
      const now = Math.floor(Date.now() / 1000);
      const bucketSize = granularity === "1m" ? 60 : 3600;
      const bucketTs = Math.floor(now / bucketSize) * bucketSize;

      setLiveBuckets((prev) => {
        const existing = prev.find((b) => b.timestamp === bucketTs);
        if (existing) {
          return prev.map((b) =>
            b.timestamp === bucketTs
              ? { ...b, count: b.count + update.counts[granularity] }
              : b,
          );
        }
        return [...prev.slice(-60), { timestamp: bucketTs, count: update.counts[granularity] }];
      });
    },
    [eventName, granularity],
  );

  useSSE(projectId, { onCounterUpdate });

  // Merge polled data with live increments
  const baseBuckets = data?.buckets ?? [];
  const mergedMap = new Map<number, number>();
  for (const b of baseBuckets) mergedMap.set(b.timestamp, b.count);
  for (const b of liveBuckets) {
    mergedMap.set(b.timestamp, (mergedMap.get(b.timestamp) ?? 0) + b.count);
  }
  const chartData = Array.from(mergedMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([timestamp, count]) => ({
      time: formatTime(timestamp, granularity),
      count,
    }));

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="#9ca3af"
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid #e5e7eb",
              }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function formatTime(ts: number, granularity: "1m" | "1h"): string {
  const d = new Date(ts * 1000);
  if (granularity === "1m") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
