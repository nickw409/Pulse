# Pulse

Real-time event analytics dashboard. Send events from your app via API, and watch them flow through Kafka into live-updating charts.

## What It Does

- **Ingest events** via a simple REST API with API key authentication
- **Process in real time** through Kafka consumers that validate, store, and aggregate
- **Visualize live** with configurable dashboard widgets (time series, counters, event feeds, bar breakdowns)
- **Query historically** with date-range filters and pagination
- **Define schemas** to validate incoming event properties

## Architecture

```
Your App                        Browser
   │                               ▲
   ▼                               │ SSE (live updates)
Ingestion Service (:3001)     Next.js App (:3000)
   │                               │
   ▼                               ▼
  Kafka ──────────────► Consumer Workers
  (events.raw)             │    │    │
                           ▼    ▼    ▼
                         PG  Redis  Redis pub/sub
```

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Auth | Clerk (social login) |
| API | tRPC v11, React Query v5 |
| Database | PostgreSQL via Prisma |
| Cache | Redis (counters, pub/sub) |
| Streaming | Kafka / Redpanda |
| Infrastructure | Docker, Terraform, AWS ECS Fargate |

## Prerequisites

- **Node.js** 20+
- **Docker** and Docker Compose
- **Clerk account** — [clerk.com](https://clerk.com) (free tier works)

## Quick Start

### 1. Install dependencies

```bash
git clone <repo-url> && cd Pulse
npm install
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (5432), Redis (6379), and Redpanda/Kafka (9092).

### 3. Configure environment

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://pulse:pulse@localhost:5432/pulse

# Redis
REDIS_URL=redis://localhost:6379

# Kafka
KAFKA_BROKERS=localhost:9092

# Clerk — get these from https://dashboard.clerk.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Ingestion service
INGESTION_PORT=3001
```

**Clerk setup:** Create an application at [dashboard.clerk.com](https://dashboard.clerk.com), enable at least one social login provider (Google, GitHub, etc.), and copy the API keys.

### 4. Set up the database

```bash
npm run db:push
```

This creates all tables in PostgreSQL from the Prisma schema.

### 5. Start all services

```bash
npm run dev
```

This starts the Next.js web app on **:3000**, the ingestion service on **:3001**, and the Kafka consumer — all via Turborepo.

### 6. Create your first project

1. Open [http://localhost:3000](http://localhost:3000)
2. Sign in with Clerk
3. Create a new project
4. Go to **Settings** and generate an API key

## Sending Events

### Single event

```bash
curl -X POST http://localhost:3001/v1/events \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "name": "page_view",
    "properties": {
      "path": "/home",
      "browser": "chrome",
      "country": "US"
    }
  }'
```

### Batch (up to 100)

```bash
curl -X POST http://localhost:3001/v1/events/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "events": [
      { "name": "page_view", "properties": { "path": "/pricing" } },
      { "name": "signup", "properties": { "plan": "pro" } },
      { "name": "purchase", "properties": { "amount": 49.99, "currency": "USD" } }
    ]
  }'
```

### Event format

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Event name (1–256 chars) |
| `properties` | object | no | Arbitrary key-value pairs (defaults to `{}`) |
| `timestamp` | ISO 8601 string | no | When the event occurred (defaults to now) |

## Dashboard Features

### Widgets

From the project dashboard, click **Add widget** to create:

- **Time Series** — Line chart of event counts over time (1-minute or 1-hour granularity)
- **Live Counter** — Big number showing event count in the last hour or 24 hours
- **Event Feed** — Scrolling list of events as they arrive in real time
- **Bar Breakdown** — Bar chart grouping events by any property key (e.g. browser, country)

Widgets update in real time via Server-Sent Events. No refresh needed.

### Event Schemas

Navigate to **Schemas** to define expected fields for your events. The consumer validates incoming events against these schemas and drops events that fail validation.

Each schema has:
- A name matching an event name (e.g. `purchase`)
- Fields with a name, type (`string`, `number`, `boolean`, `object`, `array`), and required flag
- Automatic version bumps on update

### Event History

Navigate to **History** to query stored events with:
- Event name filter
- Date range picker (start/end)
- Paginated results table showing event name, timestamp, and properties

## Commands Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services in development mode |
| `npm run build` | Production build of all packages |
| `npm run type-check` | TypeScript check across all packages |
| `npm run test` | Run all 72 unit tests |
| `npm run db:push` | Sync Prisma schema to database |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:generate` | Regenerate Prisma client |
| `docker compose up -d` | Start PostgreSQL, Redis, Redpanda |
| `docker compose down` | Stop infrastructure |

## Project Structure

```
pulse/
├── apps/
│   ├── web/                    # Next.js dashboard
│   │   ├── src/
│   │   │   ├── app/            # Pages (App Router)
│   │   │   ├── components/     # React components
│   │   │   ├── lib/            # Hooks, utilities, tRPC client
│   │   │   └── server/         # tRPC routers, DB/Redis clients
│   │   ├── prisma/             # Database schema
│   │   └── playwright/         # E2E tests
│   └── ingestion/              # Express event ingestion API
│       └── src/
│           ├── auth/           # API key middleware
│           ├── routes/         # Event endpoints
│           └── kafka/          # Kafka producer
├── packages/
│   ├── consumer/               # Kafka consumer workers
│   │   └── src/
│   │       ├── consumer.ts     # Message handler
│   │       ├── schema-validator.ts
│   │       ├── pg-writer.ts    # Batched PostgreSQL inserts
│   │       ├── redis-updater.ts # Sliding-window counters
│   │       └── sse-publisher.ts # Real-time notifications
│   ├── shared/                 # Shared types + Zod schemas
│   └── tsconfig/               # Shared TypeScript configs
├── infra/terraform/            # AWS infrastructure
├── .github/workflows/          # CI, E2E, and deploy pipelines
└── docker-compose.yml          # Local dev infrastructure
```

## Production Deployment

### Docker

Multi-stage Dockerfiles are provided for all three services:

```bash
# Build all images
docker build -f apps/web/Dockerfile -t pulse/web .
docker build -f apps/ingestion/Dockerfile -t pulse/ingestion .
docker build -f packages/consumer/Dockerfile -t pulse/consumer .

# Or use docker compose with all services
docker compose up --build
```

### AWS (Terraform)

The `infra/terraform/` directory provisions the full stack:

- **VPC** with public/private subnets, NAT gateway
- **ECS Fargate** — 3 services (web, ingestion, consumer) with 2 tasks each
- **ALB** — routes `/v1/*` to ingestion, everything else to web
- **RDS** — PostgreSQL 16 (`db.t3.micro`)
- **ElastiCache** — Redis 7 (`cache.t3.micro`)
- **MSK** — Kafka 3.5.1 (2 brokers, `kafka.t3.small`)
- **ECR** — Container registries for all three images

```bash
cd infra/terraform
terraform init
terraform plan
terraform apply
```

### CI/CD (GitHub Actions)

Three workflows are configured:

- **CI** (`ci.yml`) — Runs on every push/PR: lint, type-check, unit tests, build
- **E2E** (`e2e.yml`) — Runs on push to main: Playwright tests with real Postgres + Redis
- **Deploy** (`deploy.yml`) — Runs on push to main after CI passes: builds Docker images, pushes to ECR, applies Terraform, updates ECS services

Required GitHub secrets: `AWS_ACCOUNT_ID`, `AWS_DEPLOY_ROLE_ARN`, `DB_PASSWORD`, `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.

## License

Private project.
