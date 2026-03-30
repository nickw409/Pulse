import express from "express";
import cors from "cors";
import { connectProducer, disconnectProducer } from "./kafka/producer.js";
import { apiKeyAuth } from "./auth/api-key.js";
import eventsRouter from "./routes/events.js";

const app = express();
const port = process.env.INGESTION_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// All event routes require a valid API key
app.use(apiKeyAuth);
app.use(eventsRouter);

async function start() {
  await connectProducer();

  const server = app.listen(port, () => {
    console.log(`Ingestion service listening on port ${port}`);
  });

  const shutdown = async () => {
    console.log("Shutting down ingestion service...");
    server.close();
    await disconnectProducer();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

start().catch((err) => {
  console.error("Failed to start ingestion service:", err);
  process.exit(1);
});
