"use client";

import { useState } from "react";
import type { Widget } from "@/server/routers/dashboard";

type WidgetType = Widget["type"];

const WIDGET_TYPES: { value: WidgetType; label: string }[] = [
  { value: "time_series", label: "Time Series" },
  { value: "counter", label: "Live Counter" },
  { value: "event_feed", label: "Event Feed" },
];

export function AddWidgetModal({
  onAdd,
  onClose,
}: {
  onAdd: (widget: Widget) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<WidgetType>("time_series");
  const [title, setTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [granularity, setGranularity] = useState<"1m" | "1h">("1m");
  const [counterWindow, setCounterWindow] = useState<"1h" | "24h">("1h");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim() || eventName || "Untitled";

    if (type === "time_series") {
      onAdd({ type, eventName, granularity, title: trimmedTitle });
    } else if (type === "counter") {
      onAdd({ type, eventName, window: counterWindow, title: trimmedTitle });
    } else if (type === "event_feed") {
      const names = eventName
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      onAdd({ type, eventNames: names, limit: 20, title: trimmedTitle });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Add Widget
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Widget type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WidgetType)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {WIDGET_TYPES.map((wt) => (
                <option key={wt.value} value={wt.value}>
                  {wt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Widget title"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {type === "event_feed"
                ? "Event names (comma-separated, or blank for all)"
                : "Event name"}
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={
                type === "event_feed" ? "page_view, purchase" : "page_view"
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              required={type !== "event_feed"}
            />
          </div>

          {type === "time_series" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Granularity
              </label>
              <select
                value={granularity}
                onChange={(e) =>
                  setGranularity(e.target.value as "1m" | "1h")
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="1m">1 minute</option>
                <option value="1h">1 hour</option>
              </select>
            </div>
          )}

          {type === "counter" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Window
              </label>
              <select
                value={counterWindow}
                onChange={(e) =>
                  setCounterWindow(e.target.value as "1h" | "24h")
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="1h">Last hour</option>
                <option value="24h">Last 24 hours</option>
              </select>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
