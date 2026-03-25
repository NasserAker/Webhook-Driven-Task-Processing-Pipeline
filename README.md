# Webhook Pipeline

Webhook-driven task processing pipeline built with:

- Node.js + TypeScript
- Express (API)
- BullMQ (Redis-backed queue)
- Prisma (PostgreSQL ORM)
- A background worker process for delivery + retries

## Architecture

- **API server**
  - Receives incoming webhooks
  - Creates a `Job` in Postgres
  - Enqueues a BullMQ job in Redis
- **Worker**
  - Pulls jobs from Redis
  - Loads job + pipeline configuration from Postgres
  - Runs an action (`transform` / `filter` / `http_enrichment`)
  - Delivers results to active subscribers
  - Records delivery attempts and marks jobs as completed/failed

## Services

- **Postgres**: persistent storage for pipelines, jobs, subscribers, delivery attempts
- **Redis**: queue backend for BullMQ

## Requirements

- Node.js (project was tested with Node 20+)
- npm
- Docker + Docker Compose (recommended for running Postgres/Redis)

## Environment variables

The app loads environment variables from `.env` (see `src/config.ts`).

Required:

- `DATABASE_URL`

Optional (defaults shown):

- `PORT` (default: `3000`)
- `NODE_ENV` (default: `development`)
- `REDIS_URL` (default: `redis://localhost:6379`)
- `WORKER_POLL_INTERVAL_MS` (default: `1000`)
- `WORKER_CONCURRENCY` (default: `5`)
- `JOB_MAX_ATTEMPTS` (default: `5`)
- `JOB_RETRY_BASE_DELAY_MS` (default: `1000`)
- `API_KEY_SECRET` (default: `dev-secret`)
- `WEBHOOK_SIGNATURE_SECRET` (default: `dev-webhook-secret`)
- `DELIVERY_TIMEOUT_MS` (default: `10000`)

### Example `.env`

```bash
DATABASE_URL=postgresql://webhook_user:webhook_pass@localhost:5432/webhook_pipeline
REDIS_URL=redis://localhost:6379
PORT=3000
NODE_ENV=development
```

## Quick start (Docker Compose)

This is the easiest way to run the full stack.

1. Create `.env` in the project root (see example above).
2. Start services:

```bash
docker compose up --build
```

What happens:

- `postgres` and `redis` containers start
- `migrate` runs once: `prisma generate` + `prisma db push`
- `api` starts on port `3000`
- `worker` starts and begins processing queue jobs

Health check:

- `GET http://localhost:3000/health`

Stop:

```bash
docker compose down
```

Note: the Docker images use `npm ci`, which requires `package-lock.json` to be in sync with `package.json`.

## Run locally (without Docker for API/Worker)

Recommended approach:

- Run Postgres + Redis via Docker Compose
- Run API + worker via `npm` scripts

### 1) Start Postgres + Redis

```bash
docker compose up -d postgres redis
```

### 2) Install dependencies

```bash
npm install
```

### 3) Generate Prisma client

```bash
npm run prisma:generate
```

### 4) Initialize / sync database schema

```bash
npm run db:push
```

### 5) Run the API

```bash
npm run dev
```

API will listen on `http://localhost:3000` by default.

### 6) Run the worker (in a second terminal)

```bash
npm run dev:worker
```

## Scripts

- `npm run dev`
  - Start API in watch mode (ts-node-dev)
- `npm run dev:worker`
  - Start worker in watch mode
- `npm run build`
  - Compile TypeScript to `dist/`
- `npm run start`
  - Run compiled API (`node dist/index.js`)
- `npm run start:worker`
  - Run compiled worker
- `npm run prisma:generate`
  - Generate Prisma client
- `npm run db:push`
  - Apply Prisma schema to DB (development-friendly)
- `npm run typecheck`
  - Run TypeScript type checking
- `npm test`
  - Run Jest tests

## API

Base URL: `http://localhost:3000`

- `GET /health`
  - Health check (includes DB connectivity)
- `POST /api/webhooks/:sourceId`
  - Receives a webhook for a pipeline identified by `sourceId`
  - Creates a job in DB and enqueues it for processing

Other routes are mounted under:

- `/api/pipelines`
- `/api/jobs`

## Troubleshooting

### `Cannot find module '@prisma/client'`

This means dependencies are missing or Prisma Client was not generated.

```bash
npm install
npm run prisma:generate
```

### `npm ci` fails with “package-lock.json out of sync”

Run:

```bash
npm install
```

Then commit the updated `package-lock.json`.

This is especially important for Docker builds, because the `Dockerfile` uses `npm ci`.

### Prisma update notice

You may see a message about an available Prisma major upgrade (e.g. `6.x -> 7.x`).
Only upgrade if you intend to, and follow the Prisma major upgrade guide.
