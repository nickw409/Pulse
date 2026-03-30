# Pulse — Real-Time Event Analytics Dashboard

## Overview

Pulse is a real-time event-driven analytics dashboard. Users send events via API, events flow through Kafka into processing pipelines, and results appear as live-updating charts on a Next.js dashboard. The system supports multiple tenants, custom event schemas, and real-time + historical views.

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts | |
| Auth | Clerk | Social login + API key management |
| API | Next.js Route Handlers + tRPC | Type-safe API layer |
| Event Ingestion | Node.js service (Express), Kafka (Redpanda) | Separate service from Next.js |
| Stream Processing | Node.js Kafka consumer workers | Aggregation + windowing |
| Primary DB | PostgreSQL via Prisma ORM | Users, projects, dashboards, event schemas |
| Time-Series Cache | Redis (sorted sets + hashes) | Real-time aggregations, sliding windows |
| Real-Time Push | Server-Sent Events (SSE) from Next.js | Dashboard live updates |
| Deployment | Docker Compose (local), AWS ECS Fargate (prod) | |
| CI/CD | GitHub Actions | Lint, test, build, deploy |
| E2E Tests | Playwright | Dashboard flows |
| Unit/Integration | Vitest (frontend), Jest (backend) | |
| IaC | Terraform | ECS, RDS, ElastiCache, MSK |

---

## System Architecture

```
                    ┌──────────────────────────────────┐
                    │          Next.js App              │
                    │  ┌────────────┐  ┌────────────┐  │
                    │  │ Dashboard   │  │ Settings   │  │
                    │  │ (Recharts)  │  │ (Schemas)  │  │
                    │  └─────┬──────┘  └────────────┘  │
                    │        │ SSE subscribe             │
                    │  ┌─────▼──────────────────────┐   │
                    │  │ tRPC Route Handlers         │   │
                    │  │ - queries (historical)      │   │
                    │  │ - SSE endpoint (live)       │   │
                    │  └─────┬──────────────────────┘   │
                    └────────┼──────────────────────────┘
                             │
               ┌─────────────┼─────────────────┐
               │             │                  │
        ┌──────▼──────┐ ┌───▼────────┐  ┌──────▼──────┐
        │ PostgreSQL   │ │ Redis      │  │ Clerk       │
        │ (Prisma)     │ │ (live agg) │  │ (auth)      │
        │              │ │            │  │             │
        │ - users      │ │ - counters │  └─────────────┘
        │ - projects   │ │ - windows  │
        │ - schemas    │ │ - streams  │
        │ - events_log │ │            │
        └──────────────┘ └──────▲─────┘
                                │
                         ┌──────┴──────────┐
                         │ Consumer Workers │
                         │ (Node.js)        │
                         │                  │
                         │ - validate event │
                         │ - aggregate      │
                         │ - write PG batch │
                         │ - update Redis   │
                         │ - publish SSE    │
                         └──────▲───────────┘
                                │ consume
                         ┌──────┴──────┐
                         │   Kafka     │
                         │  (Redpanda) │
                         │             │
                         │ topic:      │
                         │  events.raw │
                         └──────▲──────┘
                                │ produce
                     ┌──────────┴──────────┐
                     │  Ingestion Service   │
                     │  (Express + Node.js) │
                     │                      │
                     │  POST /v1/events     │
                     │  POST /v1/events/batch│
                     │  API key auth (Clerk)│
                     └──────────────────────┘
```

---

## Directory Structure

```
pulse/
├── apps/
│   ├── web/                    # Next.js 14 app
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── sign-in/
│   │   │   │   │   └── sign-up/
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── layout.tsx         # Sidebar + nav
│   │   │   │   │   ├── page.tsx           # Project list / overview
│   │   │   │   │   ├── [projectId]/
│   │   │   │   │   │   ├── page.tsx       # Live dashboard
│   │   │   │   │   │   ├── history/
│   │   │   │   │   │   │   └── page.tsx   # Historical queries
│   │   │   │   │   │   ├── schemas/
│   │   │   │   │   │   │   └── page.tsx   # Event schema editor
│   │   │   │   │   │   └── settings/
│   │   │   │   │   │       └── page.tsx   # API keys, config
│   │   │   │   ├── api/
│   │   │   │   │   └── trpc/[trpc]/
│   │   │   │   │       └── route.ts
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── charts/
│   │   │   │   │   ├── live-counter.tsx
│   │   │   │   │   ├── time-series.tsx
│   │   │   │   │   ├── bar-breakdown.tsx
│   │   │   │   │   └── event-feed.tsx
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── widget-grid.tsx
│   │   │   │   │   ├── widget-card.tsx
│   │   │   │   │   └── add-widget-modal.tsx
│   │   │   │   ├── schemas/
│   │   │   │   │   ├── schema-editor.tsx
│   │   │   │   │   └── field-builder.tsx
│   │   │   │   └── ui/                    # Shared UI primitives
│   │   │   ├── lib/
│   │   │   │   ├── trpc/
│   │   │   │   │   ├── client.ts
│   │   │   │   │   ├── server.ts
│   │   │   │   │   └── router.ts
│   │   │   │   ├── sse.ts                 # SSE hook
│   │   │   │   └── utils.ts
│   │   │   └── server/
│   │   │       ├── routers/
│   │   │       │   ├── project.ts
│   │   │       │   ├── dashboard.ts
│   │   │       │   ├── events.ts
│   │   │       │   └── schema.ts
│   │   │       ├── db.ts                  # Prisma client
│   │   │       └── redis.ts               # Redis client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── playwright/
│   │   │   └── dashboard.spec.ts
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── tsconfig.json
│   │
│   └── ingestion/              # Event ingestion service
│       ├── src/
│       │   ├── index.ts
│       │   ├── routes/
│       │   │   └── events.ts
│       │   ├── kafka/
│       │   │   └── producer.ts
│       │   ├── validation/
│       │   │   └── schema-validator.ts
│       │   └── auth/
│       │       └── api-key.ts
│       ├── Dockerfile
│       └── tsconfig.json
│
├── packages/
│   ├── consumer/               # Kafka consumer workers
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── consumer.ts
│   │   │   ├── aggregator.ts   # Windowed aggregations
│   │   │   ├── pg-writer.ts    # Batched PG inserts
│   │   │   ├── redis-updater.ts
│   │   │   └── sse-publisher.ts # Publish to Redis pub/sub for SSE
│   │   └── tsconfig.json
│   │
│   ├── shared/                 # Shared types + validation
│   │   ├── src/
│   │   │   ├── events.ts       # Event type definitions
│   │   │   ├── schemas.ts      # Schema type definitions
│   │   │   └── validation.ts   # Zod schemas
│   │   └── tsconfig.json
│   │
│   └── tsconfig/               # Shared TS configs
│       ├── base.json
│       ├── nextjs.json
│       └── node.json
│
├── infra/
│   └── terraform/
│       ├── main.tf
│       ├── ecs.tf
│       ├── rds.tf
│       ├── elasticache.tf
│       ├── msk.tf
│       └── variables.tf
│
├── docker-compose.yml          # Local dev: PG, Redis, Redpanda, all services
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + unit tests + build
│       ├── e2e.yml             # Playwright
│       └── deploy.yml          # Deploy to ECS
├── turbo.json
├── package.json
└── README.md
```

---

## Data Models (Prisma)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  projects  Project[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Project {
  id          String        @id @default(cuid())
  name        String
  slug        String        @unique
  userId      String
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  apiKeys     ApiKey[]
  schemas     EventSchema[]
  dashboards  Dashboard[]
  events      Event[]
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  @@index([userId])
}

model ApiKey {
  id          String   @id @default(cuid())
  name        String
  keyHash     String   @unique    // Store hashed, display prefix only
  keyPrefix   String              // First 8 chars for identification
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())

  @@index([keyHash])
  @@index([projectId])
}

model EventSchema {
  id          String   @id @default(cuid())
  name        String              // e.g., "page_view", "purchase"
  version     Int      @default(1)
  fields      Json                // Array of { name, type, required, description }
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([projectId, name])
}

model Event {
  id          String   @id @default(cuid())
  eventName   String
  properties  Json
  timestamp   DateTime
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@index([projectId, eventName, timestamp])
  @@index([projectId, timestamp])
}

model Dashboard {
  id          String   @id @default(cuid())
  name        String
  widgets     Json                // Array of widget configs
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([projectId])
}
```

---

## Kafka Topics

| Topic | Key | Value | Partitions |
|---|---|---|---|
| `events.raw` | `projectId` | Full event JSON | 6 |

### Event Message Schema

```typescript
interface RawEvent {
  id: string;             // UUID generated at ingestion
  projectId: string;
  eventName: string;      // e.g., "page_view", "purchase"
  properties: Record<string, unknown>;
  timestamp: string;      // ISO 8601
  receivedAt: string;     // ISO 8601, set by ingestion service
}
```

---

## Redis Data Structures

### Real-Time Counters (Sliding Windows)

```
# Events per minute (1-minute buckets, 60 retained = 1 hour)
pulse:{projectId}:counts:{eventName}:1m    → Sorted Set
  score = bucket timestamp (floored to minute)
  member = "bucket:{timestamp}" → count

# Events per hour (1-hour buckets, 24 retained = 1 day)
pulse:{projectId}:counts:{eventName}:1h    → Sorted Set

# Top event names (last hour)
pulse:{projectId}:top_events                → Sorted Set
  score = count
  member = eventName
```

### SSE Pub/Sub

```
# Channel per project for live updates
pulse:sse:{projectId}
  → Publish JSON: { type: "counter_update" | "new_event", data: {...} }
```

---

## API Design

### Ingestion Service (Express) — Port 3001

```
POST /v1/events
  Header: X-API-Key: <key>
  Body: { name: string, properties: object, timestamp?: string }
  → 202 Accepted

POST /v1/events/batch
  Header: X-API-Key: <key>
  Body: { events: Array<{ name, properties, timestamp? }> }
  → 202 Accepted (max 100 per batch)
```

### tRPC Routers (Next.js) — Port 3000

```
project.list          → Get all projects for current user
project.create        → Create new project
project.getBySlug     → Get project by slug

schema.list           → List schemas for a project
schema.create         → Create new event schema
schema.update         → Update schema (version bump)

dashboard.get         → Get dashboard config
dashboard.update      → Save widget layout

events.query          → Historical event query with filters + time range
events.liveStream     → SSE subscription for real-time updates
events.summary        → Aggregated stats (total today, top events, etc.)

apiKey.list           → List API keys (prefix only)
apiKey.create         → Generate new API key
apiKey.revoke         → Delete API key
```

---

## SSE Flow

```
1. Client connects: GET /api/trpc/events.liveStream?projectId=xxx
   → Next.js route handler subscribes to Redis pub/sub channel pulse:sse:{projectId}
   → Returns ReadableStream with SSE format

2. Kafka consumer processes event:
   → Updates Redis counters
   → Publishes to Redis channel pulse:sse:{projectId}

3. Next.js SSE handler receives Redis message:
   → Forwards to client as SSE event

4. Client React component:
   → useSSE hook parses events
   → Updates Recharts data via setState
```

---

## Consumer Worker Logic

```
For each Kafka message (RawEvent):
  1. Validate against EventSchema if one exists for eventName
  2. Aggregate:
     - Increment Redis sorted set counters (1m and 1h buckets)
     - Update top_events sorted set
  3. Persist:
     - Batch insert to PostgreSQL (flush every 100 events or 5 seconds)
  4. Publish:
     - Redis PUBLISH to pulse:sse:{projectId} with update payload
```

---

## Dashboard Widgets

Each widget is a JSON config stored in Dashboard.widgets:

```typescript
type Widget =
  | {
      type: "time_series";
      eventName: string;
      granularity: "1m" | "1h";
      title: string;
    }
  | {
      type: "counter";
      eventName: string;
      window: "1h" | "24h";
      title: string;
    }
  | {
      type: "bar_breakdown";
      eventName: string;
      groupBy: string;        // property key to group by
      title: string;
    }
  | {
      type: "event_feed";
      eventNames: string[];   // filter to these events
      limit: number;
      title: string;
    };
```

---

## Docker Compose (Local Dev)

```yaml
services:
  postgres:
    image: postgres:16
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: pulse
      POSTGRES_USER: pulse
      POSTGRES_PASSWORD: pulse
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  redpanda:
    image: redpandadata/redpanda:latest
    command:
      - redpanda start
      - --smp 1
      - --memory 512M
      - --overprovisioned
      - --kafka-addr 0.0.0.0:9092
    ports:
      - "9092:9092"
      - "8081:8081"   # Schema registry
      - "8082:8082"   # HTTP proxy

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports: ["3000:3000"]
    depends_on: [postgres, redis]
    env_file: .env

  ingestion:
    build:
      context: .
      dockerfile: apps/ingestion/Dockerfile
    ports: ["3001:3001"]
    depends_on: [redpanda]
    env_file: .env

  consumer:
    build:
      context: .
      dockerfile: packages/consumer/Dockerfile
    depends_on: [redpanda, postgres, redis]
    env_file: .env

volumes:
  pg_data:
```

---

## CI/CD — GitHub Actions

### ci.yml
```
Trigger: push to main, PR to main
Steps:
  1. Install deps (npm)
  2. Lint (eslint + prettier check)
  3. Type check (tsc --noEmit for all packages)
  4. Unit tests (vitest for web, jest for ingestion + consumer)
  5. Build (next build, tsc for services)
```

### e2e.yml
```
Trigger: push to main
Steps:
  1. Docker Compose up (PG, Redis, Redpanda)
  2. Run migrations, seed
  3. Start services
  4. Playwright tests
  5. Upload trace artifacts on failure
```

### deploy.yml
```
Trigger: push to main (after CI passes)
Steps:
  1. Build Docker images
  2. Push to ECR
  3. Terraform apply (if infra changes)
  4. Update ECS services
```

---

## Build Order

Implement in this order. Each phase produces a working state.

### Phase 1 — Scaffold + Auth
- Turborepo init with all packages
- Next.js app with App Router
- Clerk integration (sign-up, sign-in, middleware)
- Prisma schema + initial migration
- Project CRUD via tRPC
- **Checkpoint:** User can sign in, create a project, see project list

### Phase 2 — Event Ingestion Pipeline
- Express ingestion service
- Kafka producer (Redpanda)
- API key generation + hashed storage
- API key auth middleware on ingestion routes
- Kafka consumer skeleton (log to console)
- **Checkpoint:** Can POST events to ingestion API, see them logged by consumer

### Phase 3 — Processing + Storage
- Consumer validates events against schemas
- Consumer writes batched inserts to PostgreSQL
- Consumer updates Redis counters (sliding window sorted sets)
- Historical query tRPC route (events.query)
- **Checkpoint:** Events flow from API → Kafka → PG + Redis, queryable via tRPC

### Phase 4 — Real-Time Dashboard
- SSE endpoint backed by Redis pub/sub
- useSSE React hook
- Time series chart (Recharts) fed by SSE
- Live counter widget
- Event feed widget (scrolling list of recent events)
- Widget grid layout on dashboard page
- **Checkpoint:** Live dashboard updates in real time as events are posted

### Phase 5 — Schema Editor + Historical Views
- Event schema CRUD UI
- Schema validation in consumer
- Historical time-range query UI with date picker
- Bar breakdown widget (group by property)
- Add/remove widgets modal
- **Checkpoint:** Full feature set working locally

### Phase 6 — Polish + Deploy
- Playwright E2E tests (auth flow, create project, send event, verify chart)
- GitHub Actions CI pipeline
- Dockerfiles for all services
- Terraform for AWS (ECS, RDS, ElastiCache, MSK)
- Deploy pipeline
- **Checkpoint:** Running in prod on AWS

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://pulse:pulse@localhost:5432/pulse

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Ingestion
INGESTION_PORT=3001
```
