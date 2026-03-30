"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { trpc } from "@/lib/trpc/client";

export function BarBreakdown({
  projectId,
  eventName,
  groupBy,
  title,
}: {
  projectId: string;
  eventName: string;
  groupBy: string;
  title: string;
}) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const { data, isLoading } = trpc.events.breakdown.useQuery(
    {
      projectId,
      eventName,
      groupBy,
      startTime: oneDayAgo.toISOString(),
      endTime: now.toISOString(),
    },
    { refetchInterval: 60_000 },
  );

  const chartData = data?.groups ?? [];

  return (
    <div className="h-full flex flex-col">
      <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
      <p className="text-xs text-gray-400 mb-2">
        by <span className="font-mono">{groupBy}</span> (last 24h)
      </p>
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            Loading…
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-gray-400">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="value"
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
              <Bar
                dataKey="count"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
