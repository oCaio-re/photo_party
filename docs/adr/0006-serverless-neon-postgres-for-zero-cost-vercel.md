# Serverless Neon PostgreSQL Migration for Zero-Cost Vercel Deployment

## Context
Deploying Photo Party onto Vercel Serverless requires a database with zero cold-start friction, high connection pooling resilience, and decoupled storage, as Vercel functions run in ephemeral environments with read-only filesystems (rendering local SQLite files ephemeral and unsuitable).

## Decision
Migrate database persistence from SQLite (`better-sqlite3`) to Neon Serverless PostgreSQL (`@neondatabase/serverless` + `drizzle-orm/neon-http`).
- **Connection Model**: HTTP-based serverless querying without TCP connection pool exhaustion.
- **Cost**: 100% permanently free on Neon's free tier (0.5 GB Postgres storage, zero-sleep compute).
- **Automation**: Automatic schema creation (`ensureSchema`) and initial seeding of the flagship wedding event (`caio-e-sarah`), alongside a dedicated CLI setup script (`npm run db:setup`).
- **Storage**: Unchanged and decoupled; photos are stored on Cloudflare R2 (10 GB free, 0 egress fees).
