import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

const mockFindUnique = vi.fn();
const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    apiKey: {
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  })),
}));

const { apiKeyAuth } = await import("./api-key.js");

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

function mockReqRes(headers: Record<string, string> = {}) {
  const req = {
    header: vi.fn((name: string) => headers[name]),
  } as any;
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as any;
  const next = vi.fn();
  return { req, res, next };
}

describe("apiKeyAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when X-API-Key header is missing", async () => {
    const { req, res, next } = mockReqRes();

    await apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Missing X-API-Key header" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when API key is not found in database", async () => {
    const { req, res, next } = mockReqRes({ "X-API-Key": "pk_invalid_key" });
    mockFindUnique.mockResolvedValue(null);

    await apiKeyAuth(req, res, next);

    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { keyHash: hashKey("pk_invalid_key") },
    });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("sets projectId and calls next on valid key", async () => {
    const apiKey = "pk_test_abc123";
    const { req, res, next } = mockReqRes({ "X-API-Key": apiKey });
    mockFindUnique.mockResolvedValue({
      id: "key_1",
      projectId: "proj_1",
      keyHash: hashKey(apiKey),
    });

    await apiKeyAuth(req, res, next);

    expect(req.projectId).toBe("proj_1");
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("hashes key with SHA-256 before lookup", async () => {
    const apiKey = "pk_specific_key_value";
    const { req, res, next } = mockReqRes({ "X-API-Key": apiKey });
    mockFindUnique.mockResolvedValue(null);

    await apiKeyAuth(req, res, next);

    const expectedHash = hashKey(apiKey);
    expect(mockFindUnique).toHaveBeenCalledWith({
      where: { keyHash: expectedHash },
    });
  });
});
