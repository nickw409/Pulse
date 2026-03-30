import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateMany = vi.fn().mockResolvedValue({ count: 0 });

vi.mock("./db.js", () => ({
  db: {
    event: {
      createMany: mockCreateMany,
    },
  },
}));

const { addEvent, stopWriter } = await import("./pg-writer.js");

function makeEvent(id: string = "a1b2c3d4-e5f6-7890-abcd-ef1234567890") {
  return {
    id,
    projectId: "proj_1",
    eventName: "click",
    properties: { x: 10 },
    timestamp: "2026-03-01T12:00:00.000Z",
    receivedAt: "2026-03-01T12:00:01.000Z",
  };
}

describe("pg-writer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flushes events to PG on stopWriter", async () => {
    addEvent(makeEvent("id-1"));
    addEvent(makeEvent("id-2"));

    await stopWriter();

    expect(mockCreateMany).toHaveBeenCalledTimes(1);
    expect(mockCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ id: "id-1", eventName: "click" }),
        expect.objectContaining({ id: "id-2", eventName: "click" }),
      ]),
      skipDuplicates: true,
    });
  });

  it("does not flush when buffer is empty", async () => {
    await stopWriter();
    expect(mockCreateMany).not.toHaveBeenCalled();
  });

  it("maps event fields correctly for Prisma", async () => {
    addEvent(makeEvent("id-3"));
    await stopWriter();

    const call = mockCreateMany.mock.calls[0][0];
    expect(call.data[0]).toEqual(
      expect.objectContaining({
        id: "id-3",
        eventName: "click",
        properties: { x: 10 },
        projectId: "proj_1",
      }),
    );
    expect(call.data[0].timestamp).toBeInstanceOf(Date);
  });
});
