# Architecture

## Main modules

The current project is organized around small feature boundaries:

```text
src/
  app/                  # Next.js routes and UI
  modules/
    ingestion/          # implemented source collection and normalization
    metadata-enrichment/ # implemented lightweight HTML description enrichment
    technical-relevance/ # implemented semantic software relevance gate
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

Each source has its own adapter. `HackerNewsSource` uses the official API for general discovery from current Hacker News feeds, while `HackerNewsSearchSource` uses HN Search powered by Algolia for recent stories matching configured technical interests. `RssSource` handles RSS/Atom feeds. A future `GitHubSource` can follow the same boundary if needed. Provider response types, search parameters, and feed parsing details remain inside their source boundary. The rest of the application consumes normalized data.

HN Search makes one `search_by_date` request per configured topic with `tags=story`, a shared `created_at_i` cutoff, and a bounded result count. Per-topic failures are logged and isolated. Results then use the existing normalizer, deterministic content classification, deduplication, and persistence path; no parallel storage pipeline exists. The Algolia endpoint is only an external search API over Hacker News content and does not make Algolia or Firebase part of StackPulse infrastructure.

The ingestion service applies source-independent deterministic deduplication before persistence. It prioritizes exact URLs, then canonical URLs that remove fragments, common tracking parameters, and safe non-root trailing slashes. Original URLs remain available as source links, while new records store a uniquely indexed canonical representation. Existing records without a canonical value are compared by canonicalizing their original URL at ingestion time. Title normalization is available as a reusable comparison primitive but is not used to discard records. Semantic deduplication is not implemented.

Content type is detected deterministically immediately after normalization and before persistence. YouTube hostnames are classified as `VIDEO`; other valid HTTP(S) links are currently `ARTICLE`, and malformed or unsupported URLs are `UNKNOWN`. Video links remain persisted, but topic discovery and ranking must exclude them until explicit video-content extraction support exists. Future transcription or caption ingestion may change that eligibility rule; no such extraction is currently implemented.

## Metadata enrichment

Metadata enrichment is source-independent and remains separate from ingestion and Technical Relevance:

```text
Ingestion → Normalization → Deduplication → Content Type Classification
    → Metadata Enrichment → Technical Relevance → future Topic Discovery
```

The manual enrichment service selects `ARTICLE` records with no non-whitespace summary. Normal runs select only the `PENDING` state. It performs no AI request and never replaces a summary supplied by Hacker News, RSS, or another source. A transaction rechecks the current summary before persisting, so concurrently added source context is preserved.

The native Node.js fetch API retrieves only HTML metadata using a StackPulse User-Agent, a configurable whole-request timeout, a five-redirect ceiling, and a configurable streaming byte limit. Every redirect is handled manually and revalidated. Unsupported content types return `NO_METADATA`; HTTP, DNS, timeout, unsafe-URL, redirect, and size-limit errors return `FAILED`. HTML is parsed with `node-html-parser`, not regular expressions. Description priority is `meta[name=description]`, `meta[property=og:description]`, then `meta[name=twitter:description]`; entities and repeated whitespace are normalized, empty values are rejected, and persisted descriptions are capped at 1,000 characters.

The fetcher rejects non-HTTP(S) URLs, credentials in URLs, localhost-style names, common local suffixes, private/reserved literal IP ranges, and hostnames whose DNS answers contain a private address. This is focused SSRF mitigation rather than an enterprise network boundary. DNS rebinding or a DNS change between validation and the native fetch connection remains possible, and a public endpoint may itself proxy private resources. Production should add outbound firewall or proxy policy if enrichment processes untrusted sources at scale.

`SourceItem.metadataEnrichmentStatus` distinguishes `PENDING`, `ENRICHED`, `NO_METADATA`, and `FAILED`; `metadataEnrichmentAttemptedAt` records terminal attempts. Default runs do not retry attempted records. `--force` retries `NO_METADATA` and `FAILED` deliberately, never selects `ENRICHED`, and still cannot overwrite a useful summary. Work is distributed across a small configurable worker pool without a queue framework. Enrichment and relevance stay independently invokable so a developer can enrich first and then deliberately use the relevance command's existing `--force` option.

This stage does not perform full article extraction, Readability processing, headless browsing, JavaScript execution, summarization, video transcription, Topic Discovery, or ranking.

## Technical relevance

After deterministic deduplication and content-type detection, a source-independent AI gate separates content meaningfully related to software engineering or closely related computing technology from semantic false positives produced by keyword search. This is a coarse, recall-oriented eligibility gate: adjacent computing infrastructure and hardware may pass with moderate scores, while future Topic Discovery and Ranking will decide content value, profile relevance, and priority. Ingestion still stores every normalized item. `VIDEO` items remain ineligible for AI evaluation, and an article classified as `NON_SOFTWARE` remains stored for auditability but is excluded from future Topic Discovery.

The manual evaluator selects non-video `SourceItem` records whose `technicalRelevanceEvaluatedAt` is null, then sends only id, title, source, hostname, existing summary, and optional publication date to `gpt-5.4-nano`. It uses batches of 25, a 2,000-token output limit, and strict JSON-schema Structured Outputs. Returned IDs, uniqueness, completeness, score bounds, categories, and concise reasons are validated before an entire batch is persisted transactionally. A failed batch remains unevaluated; earlier successful batches remain committed.

The model returns a semantic boolean and a 0-10 score. Application eligibility requires all of: the model assessment is relevant, the score is at least 6, and the category is not `NON_SOFTWARE`. The final boolean is persisted as `technicalRelevant` together with the score, category, reason, and evaluation timestamp. The timestamp distinguishes unevaluated content from evaluated-and-rejected content and prevents repeat charges unless a developer explicitly uses `--force`.

`buildTopicDiscoveryCandidateWhere` provides the reusable future query boundary: candidates must be non-video, evaluated, and `technicalRelevant = true`, with an optional publication-date cutoff. It does not perform Topic Discovery or ranking.

Exact and canonical URL comparison also collapses a story returned by several HN Search topics and prevents duplicates between HN Search, official Hacker News, and RSS. Query provenance is intentionally not stored: `SourceItem` has no natural metadata field, and adding schema solely for search terms would add complexity without affecting ingestion behavior.

## Persistence

SQLite is appropriate now because StackPulse is a single-user application with very low write volume. It keeps local development and MVP setup simple, requires no database server administration, and works directly with the existing Prisma models.

A future migration to PostgreSQL can be considered if requirements change, such as multi-user access, cloud deployment constraints, or significant concurrency. PostgreSQL is not currently required or planned as committed work.

## AI boundary

AI must not handle deterministic operations such as renaming fields, parsing timestamps, validating required fields, or obvious exact-URL duplicate checks. These belong in TypeScript. AI should be reserved for semantic or judgment-heavy work such as relevance classification, ranking, research, drafting, and review.

The shared server-side AI boundary lives in `src/lib/ai`. It owns a lazily created official OpenAI SDK client, environment configuration, provider-response usage mapping, local pricing, usage persistence, and the monthly budget preflight. Feature modules call `executeAiRequest` with a feature name, input, and their own output-token limit; they may override the configured default model only for a concrete need and may supply a strict JSON schema for Structured Outputs. This is an application-owned request boundary, not an agent or workflow framework.

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
