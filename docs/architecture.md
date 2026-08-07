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
Deterministic content-type detection
        ↓
IngestionService and persistence
```

Each source has its own adapter, such as the implemented `HackerNewsSource` and `RssSource`, with a future `GitHubSource` following the same boundary if needed. Provider response types and RSS/Atom parsing details remain inside their source boundary. The rest of the application consumes normalized data.

The ingestion service applies source-independent deterministic deduplication before persistence. It prioritizes exact URLs, then canonical URLs that remove fragments, common tracking parameters, and safe non-root trailing slashes. Original URLs remain available as source links, while new records store a uniquely indexed canonical representation. Existing records without a canonical value are compared by canonicalizing their original URL at ingestion time. Title normalization is available as a reusable comparison primitive but is not used to discard records. Semantic deduplication is not implemented.

Content type is detected deterministically immediately after normalization and before persistence. YouTube hostnames are classified as `VIDEO`; other valid HTTP(S) links are currently `ARTICLE`, and malformed or unsupported URLs are `UNKNOWN`. Video links remain persisted, but topic discovery and ranking must exclude them until explicit video-content extraction support exists. Future transcription or caption ingestion may change that eligibility rule; no such extraction is currently implemented.

## Persistence

SQLite is appropriate now because StackPulse is a single-user application with very low write volume. It keeps local development and MVP setup simple, requires no database server administration, and works directly with the existing Prisma models.

A future migration to PostgreSQL can be considered if requirements change, such as multi-user access, cloud deployment constraints, or significant concurrency. PostgreSQL is not currently required or planned as committed work.

## AI boundary

AI must not handle deterministic operations such as renaming fields, parsing timestamps, validating required fields, or obvious exact-URL duplicate checks. These belong in TypeScript. AI should be reserved for semantic or judgment-heavy work such as ranking, research, drafting, and review.

The shared server-side AI boundary lives in `src/lib/ai`. It owns a lazily created official OpenAI SDK client, environment configuration, provider-response usage mapping, local pricing, usage persistence, and the monthly budget preflight. Feature modules call `executeAiRequest` with a feature name, input, and their own output-token limit; they may override the configured default model only for a concrete need. This is an application-owned request boundary, not an agent or workflow framework.

`OPENAI_API_KEY`, `OPENAI_DEFAULT_MODEL`, and `AI_MONTHLY_BUDGET_USD` are required for AI requests. Keeping the key in server-only code prevents client bundles from receiving it. Model pricing is a small explicit table of per-million input and output token prices. Unknown model prices are rejected before a provider call, and the table must be updated manually when OpenAI pricing changes.

Before each provider call, the boundary sums successful estimated cost during the current UTC calendar month. A call is rejected if spending has already reached the configured application budget. This preflight is deliberately simple and independently testable; it is not a transactional reservation, cannot know a request's final cost in advance, and does not replace provider-side billing controls.

## Human in the loop

The current Prisma `PostStatus` enum contains:

```text
DRAFT → IN_REVIEW → APPROVED → PUBLISHED
```

It also contains `ARCHIVED`. This enum prepares the intended direction, but no post workflow or transition enforcement is implemented yet. Before publishing is added, the application must enforce explicit human approval.

## Cost observability

Each attempted provider request creates a minimal `AiUsage` record containing its feature, model, input/output token counts, estimated USD cost, duration, success/failure status, and request timestamp. Total tokens remain available in the application result and are derived from the persisted input/output counts when needed. Failed provider requests use zero token counts and no cost estimate because actual usage is unavailable.

Prompts, completions, provider payloads, conversations, and agent state are intentionally excluded. The additive model supports historical cost reporting and budget enforcement across the independent AI stages planned for StackPulse without coupling those stages to ingestion or content modules.
