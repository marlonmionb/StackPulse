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
    content-kind/        # implemented editorial/source-nature classification
    topics/             # implemented discovery, grouping, ranking, and persistence
    topic-research/     # explicit grounded research and versioned evidence
    author-profile/     # verified author context for future editorial stages
    angles/             # research-versioned editorial plans and human selection
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
    → Metadata Enrichment → Technical Relevance → Content Kind → Topic Discovery / Ranking
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

Technical Relevance persists the final eligibility boolean so later stages do not duplicate its score/category threshold logic. Topic Discovery composes that result with its own Content Kind policy at one reusable candidate-selection boundary.

## Content Kind

Content Type remains the deterministic physical/basic URL format (`ARTICLE`, `VIDEO`, or `UNKNOWN`). Content Kind is a separate semantic classification of editorial/source purpose: `TECHNICAL_ARTICLE`, `TECHNICAL_NEWS`, `OFFICIAL_TECHNICAL`, `RESEARCH`, `REPOSITORY`, `PRODUCT_PAGE`, `DISCUSSION`, or `OTHER`. It does not replace Technical Relevance; a product landing page can be technically relevant while its Content Kind is `PRODUCT_PAGE`.

The manual classifier selects non-video records that have passed Technical Relevance. It sends only id, title, URL/hostname, source, existing summary, and optional technical category to `gpt-5.4-nano` in batches of 25 with a 2,000-token output limit. Strict Structured Outputs require one bounded classification per supplied id, controlled kind/confidence enums, and a short reason. Runtime validation rejects malformed JSON, missing/unknown/duplicate ids, invalid enums, and empty or oversized reasons before transactional persistence.

Nullable fields distinguish legacy/unevaluated records from evaluated `OTHER` records. Normal runs skip a current classification; `--force` deliberately overwrites it. A result is stale and eligible again when successful metadata enrichment occurred after Content Kind evaluation, because the new summary may materially change the evidence. Failed or metadata-empty enrichment does not invalidate it.

## Topic Discovery and ranking

Topic Discovery combines eligible SourceItems into content opportunities. Its centralized candidate boundary composes the existing non-video and Technical Relevance requirements with Content Kind policy, then applies the configured lookback and item ceiling. Strong seeds are technical articles/news, official technical material, and research. Repositories and discussions remain eligible but are identified as supporting-strength sources. `PRODUCT_PAGE` and `OTHER` remain persisted but are excluded from discovery input, so they cannot independently create a Topic. The concise metadata payload adds Content Kind and source-strength semantics but contains no article body, HTML, Prisma metadata, or relevance-reason text, and performs no external fetch.

The dedicated prompt distinguishes the broad relevance gate from discovery and ranking. It forbids generalizing one product/tool launch, repository, or isolated announcement into an ecosystem trend without multiple supplied independent sources; single-source topics must remain narrow and factual. Ranking explicitly values substantive engineering material, research, official technical documentation, and independent corroboration above weak launch evidence. Strict Structured Outputs provide a bounded topic array, and runtime validation preserves the existing score, support-id, and topic-count guarantees.

Profile interests live centrally in Topic Discovery configuration and default to the current React, TypeScript, Java/Spring, frontend/backend/full-stack, API, database/PostgreSQL, distributed systems/Kafka, AWS/cloud, architecture/system-design, and AI-engineering interests. They are replaceable by future user settings without distributing profile checks through application logic.

`TopicSourceItem` models the many-to-many evidence relationship. Topic score components, ranking reason, discovery timestamp, and `DISCOVERED` lifecycle status are persisted. A SHA-256 signature of the sorted supporting SourceItem ids is unique; an exact rerun updates that Topic and its relationships while preserving its lifecycle status. This deliberately limited strategy does not detect semantically equivalent historical Topics when the supporting set changes. Writing, publishing, and analytics remain separate future stages. Topic Research is independently invoked for one explicit human-selected Topic and is never triggered by discovery.

## Human Topic selection and grounded research

```text
Topic Discovery / Ranking
        -> derived current selectability
        -> explicit human Topic ID
        -> bounded Responses API Web Search evidence collection
        -> canonical URL consolidation + internal source IDs
        -> no-search strict Structured synthesis
        -> transactional TopicResearch + TopicResearchSource + RESEARCHED lifecycle
        -> explicit Angle Generation for one research ID
```

Current selectability reuses `isEligibleForTopicDiscovery` over a Topic's present SourceItem relationships. It requires at least one currently eligible supporting item and an allowed lifecycle (`DISCOVERED`, `SELECTED`, or `RESEARCHED`). This derived state does not replace editorial lifecycle. Historical rows with only ineligible support remain persisted and appear only under explicit historical listing; archived lifecycle is reported separately.

The explicit research command changes `DISCOVERED` to `SELECTED` before its provider operation. Only a validated and transactionally persisted report changes the Topic to `RESEARCHED`; failed attempts may remain selected. Exact Topic Discovery upserts do not write `status`, so they cannot reset `SELECTED` or `RESEARCHED`. Re-research requires `--force` and appends a new report rather than overwriting history.

The installed OpenAI SDK exposes Web Search, strict Structured Outputs, medium reasoning, returned action sources/URL citations, reasoning-token usage, and `max_tool_calls`. The SDK-specific beta Responses surface currently carries that native maximum-call field, and this detail stays isolated in the shared AI provider. The adapter requests `include: ["web_search_call.action.sources"]` and reads every URL from each search action's `sources` array. It also reads provider-created `url_citation` annotations, which SDK 7.4.0 defines as citations to web resources used for the response, and uses their titles as metadata where available. It does not extract ordinary or Markdown URLs from model text, and open/find action targets do not substitute for the complete search source list.

Research uses two stages so source identity is deterministic: evidence collection performs at most four Web Search calls and returns narrative context without source records; application code then validates HTTP(S) seed plus provider URLs, canonicalizes and deduplicates them, merges the best metadata, and assigns short internal IDs; no-search Structured synthesis receives only that evidence set and the bounded narrative. Persisted URLs must match bounded Topic seeds or provider-returned Web Search metadata. Same-host, repository-prefix, and child-path relationships grant no trust. The report retains at most ten sources and bounded seed summaries; it stores structured sections as pragmatic JSON rather than sentence-level tables.

URL grounding answers whether a cited source belongs to that deterministic evidence set. Semantic citation grounding asks whether the source supports the claim being made. The synthesis prompt requires direct entity-specific attribution, complete evidence for compound claims, precise vendor-claim wording, and confidence based on support directness. Runtime checks still enforce source identity and citation structure; StackPulse does not claim to formally prove semantic entailment in application code.

Evidence origin, source provenance, and citation support remain separate. Origin records whether evidence came from a bounded `TOPIC_SEED`, `WEB_SEARCH`, or their canonical merge. The existing no-search synthesis call classifies every application-owned source ID exactly once as coarse `PRIMARY` first-party/original evidence or `SECONDARY` independent reporting/analysis; Web Search does not imply secondary, and a Topic seed does not imply primary. Runtime validation rejects missing, duplicate, unknown-ID, or invalid-enum assessments before `TopicResearchSource.type` is persisted. This type is not a reliability score and is not claim-specific; citation grounding still governs whether each source supports each finding.

`TopicResearch` is append-only history for a Topic. `TopicResearchSource` stores the exact evidence ID, original returned URL, canonical URL, publisher/domain/date, and a small `PRIMARY`/`SECONDARY` taxonomy. Future editorial stages can reference a specific research ID. Product pages may be primary evidence of vendor claims during research but remain excluded from Topic Discovery and are not independent proof of performance or adoption.

Exact and canonical URL comparison also collapses a story returned by several HN Search topics and prevents duplicates between HN Search, official Hacker News, and RSS. Query provenance is intentionally not stored: `SourceItem` has no natural metadata field, and adding schema solely for search terms would add complexity without affecting ingestion behavior.

## Author Profile Context and future editorial boundary

The manually maintained, version-controlled `docs/author-profile.md` file is the source of truth for verified professional experience, personal-project experience, learning/exploration areas, positioning, content goals, and authorship constraints. The `author-profile` module reads it as UTF-8 prompt-ready Markdown, trims file-boundary whitespace, enforces a 12,000-character maximum, and deterministically requires its six conceptual sections. It does not parse technologies into entities, use AI, or persist anything in Prisma.

Topic Research and Author Profile answer different questions:

```text
TopicResearch  -> What grounded evidence supports the technical subject?
AuthorProfile  -> What can this author credibly claim about personal experience?

TopicResearch + AuthorProfile
            -> Angle Generation
            -> human angle selection
            -> future Draft Generation
```

Angle Generation distinguishes a strong verified professional connection, a personal-project connection, a learning/exploration connection, and no personal connection. With no connection, a useful technical explanation or trade-off analysis is valid and preferable to an invented anecdote. Project experience remains framed as project experience, and learning never implies production expertise. Future Draft Generation must run only after human angle selection.

This is an editorial/personalization boundary. Author Profile context does not affect Technical Relevance, Content Kind, Topic Discovery, Topic Ranking, or Topic Research factual synthesis. Technical claims remain grounded in the selected TopicResearch report and its evidence. Angle Generation and angle selection are implemented; Draft Generation remains unimplemented.

## Angle Generation and human selection

```text
one exact TopicResearch + its TopicResearchSource evidence
                     + validated AuthorProfile
                     -> one bounded no-search Structured Output request
                     -> transactional ContentAngle candidate set
                     -> explicit human selection
                     -> future Draft Generation
```

The command requires a `TopicResearch` ID and validates the report, parent Topic, evidence, Author Profile, feature configuration, model pricing, and monthly budget before provider execution. Existing candidates cause a zero-request skip unless `--force` deliberately creates a new generation. A UUID shared by all candidates in one call provides append-only generation history; no generation table is needed for the MVP.

`ContentAngle` belongs to exactly one `TopicResearch`, stores its author-connection enum, fit score, optional human-input question, concise claim-boundary notes, model, status, and the SHA-256 hash of the loaded profile. It never stores the full profile. `ContentAngleSource` provides relational integrity to existing `TopicResearchSource` rows; prompt and output contracts use their application-owned `evidenceId` values rather than introducing another source identity.

The dedicated prompt labels research and profile context separately. TopicResearch is the only technical factual source, while AuthorProfile is the only personal-experience source. Runtime validation enforces exact candidate count, controlled connection and status values, score/text bounds, known unique evidence IDs, evidence presence, distinct normalized titles/theses, and human-input field consistency. Semantic author fit and uncertainty preservation remain prompt-enforced rather than guessed with keyword rules.

Selection performs no AI call. In one SQLite transaction it returns any selected angle for the same research report to `GENERATED` and marks the explicit angle `SELECTED`; candidates belonging to other research reports are untouched. Exactly one selection therefore applies across forced generations. No angle is automatically selected or deleted.

Future Draft Generation must require the selected `ContentAngle`, its exact referenced `TopicResearch`, a validated Author Profile, the angle's claim-boundary notes, and any optional human context collected by a future feature. It must not choose a different angle. Draft Generation is not implemented.

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

Each attempted provider request creates a minimal `AiUsage` record containing its feature, model, input/output and reasoning token counts, Web Search call count, estimated token/tool/total USD cost, duration, success/failure status, and request timestamp. Failed provider requests use zero usage only when the provider exposes none; if an error exposes incurred usage, it remains recorded. Monthly budget accounting sums total estimated provider cost rather than token-only cost.

Prompts, completions, provider payloads, conversations, and agent state are intentionally excluded. The additive model supports historical cost reporting and budget enforcement across the independent AI stages planned for StackPulse without coupling those stages to ingestion or content modules.
