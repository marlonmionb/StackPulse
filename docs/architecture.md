# Architecture

## Main modules

The current project is organized around small feature boundaries:

```text
src/
  app/                  # Next.js routes and UI
  modules/
    ingestion/          # implemented source collection and normalization
    topics/             # reserved for future topic workflows
    posts/              # reserved for future content workflows
    analytics/          # reserved for future performance analysis
  lib/
    db/                 # Prisma client singleton
    ai/                 # add only when AI integration exists
```

The reserved modules do not imply service or repository layers. New abstractions should be introduced only when concrete behavior needs them.

## Ingestion

```text
External API format
        ↓
Source adapter
        ↓
Normalizer
        ↓
NormalizedSourceItem
        ↓
IngestionService and persistence
```

Each source has its own adapter, such as the implemented `HackerNewsSource` and `RssSource`, with a future `GitHubSource` following the same boundary if needed. Provider response types and RSS/Atom parsing details remain inside their source boundary. The rest of the application consumes normalized data.

The current ingestion service removes duplicate URLs within a run, checks existing `SourceItem` URLs, and inserts only new records. Semantic deduplication is not implemented.

## Persistence

SQLite is appropriate now because StackPulse is a single-user application with very low write volume. It keeps local development and MVP setup simple, requires no database server administration, and works directly with the existing Prisma models.

A future migration to PostgreSQL can be considered if requirements change, such as multi-user access, cloud deployment constraints, or significant concurrency. PostgreSQL is not currently required or planned as committed work.

## AI boundary

AI must not handle deterministic operations such as renaming fields, parsing timestamps, validating required fields, or obvious exact-URL duplicate checks. These belong in TypeScript. AI should be reserved for semantic or judgment-heavy work such as ranking, research, drafting, and review.

No AI client or AI module exists yet.

## Human in the loop

The current Prisma `PostStatus` enum contains:

```text
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
```

It also contains `ARCHIVED`. This enum prepares the intended direction, but no post workflow or transition enforcement is implemented yet. Before publishing is added, the application must enforce explicit human approval.

## Cost observability

Future AI integration should record:

- model;
- feature or stage;
- input tokens;
- output tokens;
- estimated cost;
- timestamps.

The application may later enforce its own monthly AI budget. Neither usage tracking nor budget enforcement is implemented now.
