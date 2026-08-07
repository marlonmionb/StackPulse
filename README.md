# StackPulse

StackPulse is a personal content-intelligence platform for discovering, understanding, and turning technical topics into reviewed content. This first version contains only the architectural foundation; external ingestion, AI, publishing, authentication, and analytics are out of scope.

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
- `src/modules/ingestion`: future collection and normalization workflows.
- `src/modules/topics`: future topic discovery, ranking, and selection.
- `src/modules/posts`: future drafting and human-review workflows.
- `src/modules/analytics`: reserved boundary; intentionally empty of domain logic.
- `src/lib/db`: shared database infrastructure, including the development-safe Prisma Client singleton.
- `prisma`: database schema and migrations.

Prisma 7 keeps the database URL in `prisma.config.ts` and uses its official SQLite driver adapter at runtime.

The domain modules are boundaries for future features, not framework layers. Repositories and services will be introduced only when concrete behavior requires them.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```
