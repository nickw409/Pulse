import { useEffect, useRef, useCallback } from "react";

export type SSENewEvent = {
  eventName: string;
  properties: Record<string, unknown>;
  timestamp: string;
};

export type SSECounterUpdate = {
  eventName: string;
  counts: { "1m": number; "1h": number };
};

type SSEHandlers = {
  onNewEvent?: (event: SSENewEvent) => void;
  onCounterUpdate?: (update: SSECounterUpdate) => void;
};

export function useSSE(projectId: string | undefined, handlers: SSEHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const stableProjectId = projectId;

  useEffect(() => {
    if (!stableProjectId) return;

    const url = `/api/sse/${encodeURIComponent(stableProjectId)}`;
    const source = new EventSource(url);

    source.addEventListener("new_event", (e) => {
      try {
        const data: SSENewEvent = JSON.parse(e.data);
        handlersRef.current.onNewEvent?.(data);
      } catch {
        // skip malformed
      }
    });

    source.addEventListener("counter_update", (e) => {
      try {
        const data: SSECounterUpdate = JSON.parse(e.data);
        handlersRef.current.onCounterUpdate?.(data);
      } catch {
        // skip malformed
      }
    });

    source.onerror = () => {
      // EventSource auto-reconnects — no action needed
    };

    return () => {
      source.close();
    };
  }, [stableProjectId]);
}
