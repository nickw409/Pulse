"use client";

import { useState, use } from "react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 16);
}

export default function HistoryPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const { data: project } = trpc.project.getById.useQuery({ id: projectId });

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [eventName, setEventName] = useState("");
  const [startTime, setStartTime] = useState(formatDate(oneDayAgo));
  const [endTime, setEndTime] = useState(formatDate(now));
  const [page, setPage] = useState(0);
  const limit = 50;

  const eventsQuery = trpc.events.query.useQuery(
    {
      projectId,
      eventName: eventName || undefined,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      limit,
      offset: page * limit,
    },
    { enabled: !!project },
  );

  if (!project) {
    return <div className="p-8 text-sm text-gray-400">Loading…</div>;
  }

  type EventRow = { id: string; eventName: string; timestamp: string; properties: unknown };
  const queryData: { events: EventRow[]; total: number } | undefined = eventsQuery.data as any;
  const totalPages = queryData ? Math.ceil(queryData.total / limit) : 0;

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href={`/${projectId}`}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          Event History
        </h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-4 mb-6 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Event name
          </label>
          <input
            type="text"
            value={eventName}
            onChange={(e) => {
              setEventName(e.target.value);
              setPage(0);
            }}
            placeholder="All events"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm w-48 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Start
          </label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            End
          </label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => {
              setEndTime(e.target.value);
              setPage(0);
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          onClick={() => eventsQuery.refetch()}
          className="rounded-md bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Query
        </button>
      </div>

      {/* Results */}
      {eventsQuery.isLoading && (
        <div className="text-sm text-gray-400">Loading events…</div>
      )}

      {queryData && (
        <>
          <div className="text-xs text-gray-500 mb-2">
            {queryData.total.toLocaleString()} events found
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Event
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Timestamp
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">
                    Properties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {queryData.events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap">
                      {event.eventName}
                    </td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs max-w-md truncate">
                      {JSON.stringify(event.properties)}
                    </td>
                  </tr>
                ))}
                {queryData.events.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No events found for this time range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-xs text-gray-500">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
