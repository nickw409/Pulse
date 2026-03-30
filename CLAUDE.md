# Pulse

Real-time event analytics dashboard. Users send events via API, events flow through Kafka, and results appear as live-updating charts.

## Architecture

Turborepo monorepo with npm workspaces:

- `apps/web` — Next.js 14 (App Router), tRPC, Clerk auth, Prisma ORM, Tailwind CSS, Recharts
- `apps/ingestion` — Express service (port 3001) that validates API keys and produces to Kafka
- `packages/consumer` — Kafka consumer workers: schema validation, batched PG writes, Redis counters, SSE publishing
- `packages/shared` — Shared types and Zod validation schemas (subpath exports: `@pulse/shared/events`, `@pulse/shared/validation`, `@pulse/shared/schemas`)
- `packages/tsconfig` — Shared TypeScript configs
- `infra/terraform` — AWS infrastructure (ECS Fargate, RDS, ElastiCache, MSK)

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS, Recharts
- **Auth:** Clerk (social login + session management)
- **API:** tRPC v11 + React Query v5
- **Database:** PostgreSQL via Prisma (`apps/web/prisma/schema.prisma`)
- **Cache:** Redis (ioredis) for real-time aggregations and SSE pub/sub
- **Streaming:** Kafka/Redpanda (topic: `events.raw`, keyed by projectId)
- **Testing:** Vitest (all packages), Playwright (e2e)

## Key Commands

```bash
npm run dev          # Start all services (turbo)
npm run build        # Build all packages
npm run type-check   # TypeScript check all packages
npm run test         # Run all 72 unit tests
npm run db:migrate   # Run Prisma migrations (web workspace)
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to DB without migration
docker compose up -d # PostgreSQL (5432), Redis (6379), Redpanda (9092)
```

## Project Structure Conventions

- tRPC routers live in `apps/web/src/server/routers/` and are registered in `apps/web/src/lib/trpc/router.ts`
- Pages use Next.js App Router at `apps/web/src/app/`
- Dashboard pages are under `(dashboard)/` route group with shared sidebar layout
- Auth pages are under `(auth)/` route group
- Prisma schema is at `apps/web/prisma/schema.prisma`
- The ingestion service validates API keys by hashing with SHA-256 and looking up `keyHash` in the ApiKey table
- All packages use ESM (`"type": "module"`) with `NodeNext` module resolution — use `.js` extensions in relative imports
- Test files are colocated with source (e.g. `foo.test.ts` next to `foo.ts`) and excluded from `tsconfig.json` in `apps/web`

## Event Flow

```
Client POST /v1/events → Ingestion (API key auth, Zod validation) → Kafka events.raw
→ Consumer (schema validation, batch PG insert, Redis counter update, Redis PUBLISH)
→ SSE endpoint (Redis SUBSCRIBE → ReadableStream) → Browser useSSE hook → Recharts widgets
```

## Redis Key Patterns

- `pulse:{projectId}:counts:{eventName}:1m` — sorted set, 1-minute counter buckets
- `pulse:{projectId}:counts:{eventName}:1h` — sorted set, 1-hour counter buckets
- `pulse:{projectId}:top_events` — sorted set, event name leaderboard
- `pulse:sse:{projectId}` — pub/sub channel for live dashboard updates

## Dashboard Widget Types

Stored as JSON in `Dashboard.widgets`. Types: `time_series`, `counter`, `bar_breakdown`, `event_feed`.

## tRPC Routers

- `project` — list, create, getBySlug, getById
- `apiKey` — list, create, revoke
- `events` — query (historical), summary, counters, breakdown
- `dashboard` — get, update (widget layout)
- `schema` — list, create, update (version bump), delete
