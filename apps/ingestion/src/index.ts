import express from "express";
import cors from "cors";

const app = express();
const port = process.env.INGESTION_PORT || 3001;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// TODO: Phase 2 — event ingestion routes

app.listen(port, () => {
  console.log(`Ingestion service listening on port ${port}`);
});
