import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock EventSource since we're in Node
class MockEventSource {
  static instances: MockEventSource[] = [];
  url: string;
  listeners: Record<string, ((e: { data: string }) => void)[]> = {};
  onerror: (() => void) | null = null;
  closed = false;

  constructor(url: string) {
    this.url = url;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, handler: (e: { data: string }) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(handler);
  }

  close() {
    this.closed = true;
  }

  // Helper for tests to simulate server-sent events
  emit(event: string, data: string) {
    for (const handler of this.listeners[event] ?? []) {
      handler({ data });
    }
  }
}

vi.stubGlobal("EventSource", MockEventSource);

// Must import after mocking EventSource
const { useSSE } = await import("./sse.js");

// Minimal React hooks mock
let cleanupFn: (() => void) | undefined;

vi.mock("react", () => ({
  useEffect: (fn: () => (() => void) | void, _deps: unknown[]) => {
    const result = fn();
    if (typeof result === "function") cleanupFn = result;
  },
  useRef: (initial: unknown) => ({ current: initial }),
  useCallback: (fn: Function) => fn,
}));

describe("useSSE", () => {
  beforeEach(() => {
    MockEventSource.instances = [];
    cleanupFn = undefined;
  });

  afterEach(() => {
    cleanupFn?.();
  });

  it("creates EventSource with correct URL", () => {
    useSSE("proj_1", {});

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toBe("/api/sse/proj_1");
  });

  it("does not create EventSource when projectId is undefined", () => {
    useSSE(undefined, {});

    expect(MockEventSource.instances).toHaveLength(0);
  });

  it("calls onNewEvent when new_event is received", () => {
    const onNewEvent = vi.fn();
    useSSE("proj_1", { onNewEvent });

    const source = MockEventSource.instances[0];
    source.emit(
      "new_event",
      JSON.stringify({
        eventName: "click",
        properties: { x: 10 },
        timestamp: "2026-03-01T12:00:00.000Z",
      }),
    );

    expect(onNewEvent).toHaveBeenCalledWith({
      eventName: "click",
      properties: { x: 10 },
      timestamp: "2026-03-01T12:00:00.000Z",
    });
  });

  it("calls onCounterUpdate when counter_update is received", () => {
    const onCounterUpdate = vi.fn();
    useSSE("proj_1", { onCounterUpdate });

    const source = MockEventSource.instances[0];
    source.emit(
      "counter_update",
      JSON.stringify({
        eventName: "click",
        counts: { "1m": 5, "1h": 100 },
      }),
    );

    expect(onCounterUpdate).toHaveBeenCalledWith({
      eventName: "click",
      counts: { "1m": 5, "1h": 100 },
    });
  });

  it("closes EventSource on cleanup", () => {
    useSSE("proj_1", {});

    const source = MockEventSource.instances[0];
    expect(source.closed).toBe(false);

    cleanupFn!();
    expect(source.closed).toBe(true);
  });

  it("encodes projectId in URL", () => {
    useSSE("proj with spaces", {});

    expect(MockEventSource.instances[0].url).toBe(
      "/api/sse/proj%20with%20spaces",
    );
  });

  it("ignores malformed JSON in events", () => {
    const onNewEvent = vi.fn();
    useSSE("proj_1", { onNewEvent });

    const source = MockEventSource.instances[0];
    // Should not throw
    source.emit("new_event", "not valid json{{{");

    expect(onNewEvent).not.toHaveBeenCalled();
  });
});
