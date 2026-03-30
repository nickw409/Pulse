import { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  projectId?: string;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.header("X-API-Key");

  if (!apiKey) {
    res.status(401).json({ error: "Missing X-API-Key header" });
    return;
  }

  const keyHash = hashKey(apiKey);

  const record = await db.apiKey.findUnique({
    where: { keyHash },
  });

  if (!record) {
    res.status(401).json({ error: "Invalid API key" });
    return;
  }

  // Update lastUsedAt asynchronously — don't block the response
  db.apiKey.update({
    where: { id: record.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  req.projectId = record.projectId;
  next();
}
