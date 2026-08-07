# StackPulse agent guide

## Project

StackPulse is a personal developer content-intelligence platform. Its purpose is to:

- collect technical content from external sources;
- normalize it into an internal format;
- identify relevant technical topics;
- use AI in independent stages for research, ranking, drafting, review, and analytics;
- always require human review before publishing;
- eventually publish approved content to LinkedIn;
- analyze historical content performance.

Hacker News and RSS ingestion plus the observable OpenAI request foundation are implemented. Production AI features, publishing, authentication, scheduling, and analytics are not implemented.

## Current stack

- Next.js with the App Router and React
- TypeScript in strict mode
- Node.js
- Prisma ORM with SQLite
- ESLint and the Node.js test runner via `tsx`
- Official OpenAI Node.js SDK behind a shared server-side request boundary

## Engineering principles

- Prefer simple solutions over unnecessary abstraction.
- Keep TypeScript strict and avoid unnecessary `any`.
- Keep modules small and focused.
- Do not introduce patterns only for architectural ceremony.
- Do not implement functionality beyond the requested task.
- Use deterministic TypeScript logic for deterministic transformations.
- Use AI only where semantic interpretation or judgment is useful.
- External source-specific formats must not leak into the rest of the application.
- Normalize external data before domain or business logic consumes it.
- Prefer structured AI outputs where appropriate.
- Every generated post must require explicit human approval before publication.
- Never invent personal experiences on behalf of the author.
- Add dependencies only when they solve a concrete need.
- Add tests for meaningful business or domain logic rather than excessive boilerplate.

## Workflow

1. Inspect existing code before changing it.
2. Preserve valid existing decisions.
3. Implement only the requested iteration.
4. Run relevant tests, lint, TypeScript checks, and the build when practical.
5. Summarize changed files and important decisions after completing work.

See `docs/project-context.md`, `docs/architecture.md`, and `docs/roadmap.md` for product context, architectural boundaries, and current progress.
