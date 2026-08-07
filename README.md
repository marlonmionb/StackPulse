# StackPulse

StackPulse is a personal content-intelligence platform for discovering, understanding, and turning technical topics into reviewed content. The current version includes the architectural foundation and manual Hacker News ingestion; AI, publishing, authentication, and analytics are not implemented.

## Current stack

- Next.js with the App Router
- React and TypeScript in strict mode
- Node.js
- Prisma ORM with SQLite
- ESLint

## Getting started

Install dependencies:

```bash
npm install
```

Copy the example environment file to `.env`:

```bash
cp .env.example .env
```

On Windows PowerShell, use:

```powershell
Copy-Item .env.example .env
```

Create the SQLite database, apply migrations, and generate Prisma Client:

```bash
npm run db:migrate -- --name init
npm run db:generate
```

Start the development server:

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Initial architecture

- `src/app`: routes, layouts, and UI built with the Next.js App Router.
- `src/modules/ingestion`: collection, normalization, and persistence of external content; Hacker News is currently implemented.
- `src/modules/topics`: future topic discovery, ranking, and selection.
- `src/modules/posts`: future drafting and human-review workflows.
- `src/modules/analytics`: reserved boundary; intentionally empty of domain logic.
- `src/lib/db`: shared database infrastructure, including the development-safe Prisma Client singleton.
- `prisma`: database schema and migrations.

Prisma 7 keeps the database URL in `prisma.config.ts` and uses its official SQLite driver adapter at runtime.

The domain modules are boundaries for future features, not framework layers. Repositories and services will be introduced only when concrete behavior requires them.

## Project documentation

- [`AGENTS.md`](AGENTS.md): stable instructions for coding agents.
- [`docs/project-context.md`](docs/project-context.md): product problem, expected flow, and AI stages.
- [`docs/architecture.md`](docs/architecture.md): current and intended technical boundaries.
- [`docs/roadmap.md`](docs/roadmap.md): implementation status by phase.

## Hacker News ingestion

The ingestion command retrieves the current top stories from the official Hacker News API, fetches at most 30 story details with limited concurrency, normalizes valid external links, and stores new URLs as `SourceItem` records.

Set `HN_INGESTION_LIMIT` in `.env` to an integer from 1 to 100 to change the number of top stories inspected:

```env
HN_INGESTION_LIMIT=30
```

Run ingestion manually:

```bash
npm run ingest:hacker-news
```

Repeated executions are safe: URLs already present in SQLite are skipped. You can inspect stored data with Prisma Studio:

```bash
npx prisma studio
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```
