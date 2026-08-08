# StackPulse

StackPulse is a personal content-intelligence platform for discovering, understanding, and turning technical topics into reviewed content. The current version includes multi-source ingestion, lightweight article metadata enrichment, an AI Technical Relevance Gate, and bounded Topic Discovery, semantic grouping, and profile-aware ranking. Topic Research, publishing, authentication, and analytics are not implemented yet.

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
- `src/modules/ingestion`: collection, normalization, and persistence of external content; official Hacker News, targeted Hacker News Search, and RSS/Atom sources are implemented.
- `src/modules/metadata-enrichment`: bounded, source-independent HTML description metadata fetching for summary-poor articles.
- `src/modules/technical-relevance`: batched AI semantic classification and persisted software-engineering eligibility.
- `src/modules/topics`: bounded topic candidate selection, semantic grouping, ranking, validation, and persistence.
- `src/modules/posts`: future drafting and human-review workflows.
- `src/modules/analytics`: reserved boundary; intentionally empty of domain logic.
- `src/lib/db`: shared database infrastructure, including the development-safe Prisma Client singleton.
- `src/lib/ai`: shared server-side OpenAI boundary, local pricing, usage persistence, and internal budget enforcement.
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

## Hacker News Search ingestion

Hacker News Search uses the external HN Search API powered by Algolia to discover recent stories matching configured technical interests. It complements rather than replaces official Hacker News ingestion:

```text
Official HN API       → general discovery / current Hacker News feeds
HN Search / Algolia  → targeted discovery based on configured technical interests
```

Configure at least one comma-separated topic. Empty entries are ignored; the lookback and per-topic result limit default to 7 days and 10 results:

```env
HN_SEARCH_TOPICS="react,typescript,spring boot,postgresql,distributed systems"
HN_SEARCH_LOOKBACK_DAYS=7
HN_SEARCH_RESULTS_PER_TOPIC=10
```

Run targeted ingestion manually:

```bash
npm run ingest:hn-search
```

StackPulse makes one `search_by_date` request per topic, restricted to stories newer than the shared lookback cutoff. One failed topic is logged without discarding successful topic results. Valid external links enter the same classification, canonical URL deduplication, and Prisma persistence pipeline as official Hacker News and RSS items. A story matching multiple queries is therefore stored only once. HN Search is an external HTTP API over Hacker News content, not an Algolia or Firebase application dependency.

## RSS ingestion

RSS ingestion reads multiple RSS 2.0 or Atom feeds, normalizes their entries into the same `SourceItem` format, and uses the same exact-URL duplicate protection as Hacker News. `fast-xml-parser` is used because it is a small, established XML parser with TypeScript support; feed-specific shape handling stays in the RSS adapter.

Configure a comma-separated list of feed URLs in `.env`. The example starts with three technical feeds:

```env
RSS_FEED_URLS="https://blog.cloudflare.com/rss/,https://github.blog/changelog/feed/,https://web.dev/feed.xml"
```

Run ingestion manually:

```bash
npm run ingest:rss
```

One unavailable or malformed feed is logged and skipped without preventing the other configured feeds from being ingested. Missing authors, summaries, and publication dates are accepted; invalid dates are omitted.

## Article metadata enrichment

Ingestion discovers, normalizes, classifies, deduplicates, and stores source data. Metadata enrichment is a separate optional stage that fills a missing `SourceItem.summary` from lightweight HTML metadata before Technical Relevance is evaluated:

```text
Ingestion → Content Type Classification → Metadata Enrichment → Technical Relevance
```

Only `ARTICLE` records with an HTTP(S) URL, no useful summary, and `PENDING` enrichment status are processed by default. `VIDEO` and `UNKNOWN` records are skipped. Existing summaries are never overwritten. Description priority is standard `<meta name="description">`, Open Graph `og:description`, then Twitter description. StackPulse does not extract article bodies, run page JavaScript, use AI, summarize text, or transcribe videos during enrichment.

Configure the bounded request behavior and run a limited sample:

```env
METADATA_ENRICHMENT_TIMEOUT_MS=5000
METADATA_ENRICHMENT_MAX_BYTES=262144
METADATA_ENRICHMENT_CONCURRENCY=3
```

```bash
npm run metadata:enrich -- --limit=20
```

Terminal statuses are `ENRICHED`, `NO_METADATA`, and `FAILED`; they are not retried on normal runs. `--force` deliberately retries `NO_METADATA` and `FAILED`, but still skips `ENRICHED` records and any record that now has a useful summary. Developers can then deliberately re-evaluate affected relevance results with `npm run relevance:evaluate -- --force`; the two stages are not coupled.

Legacy records whose content type is still `UNKNOWN` can be classified with the same deterministic URL rules used during ingestion:

```bash
npm run content-type:backfill
npm run content-type:backfill -- --limit=20
```

The command does not fetch URLs or run AI. It updates only `contentType` on `UNKNOWN` records; unsupported URLs remain `UNKNOWN`, and already classified records are untouched.

The fetcher accepts only HTML, checks the initial hostname and each redirect against obvious local/private hosts and resolved private IP addresses, limits redirects to five, times out the whole request, and streams at most the configured byte ceiling. This is focused SSRF risk reduction, not a network sandbox: DNS can change between validation and connection, and public servers can proxy private resources. Production deployment should also enforce outbound network policy.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

## AI Technical Relevance Gate

Ingestion and AI eligibility are intentionally different states. The Technical Relevance Gate is a broad, recall-oriented software/computing filter, not a content-ranking stage: genuinely computing-related but peripheral items should pass with moderate scores. StackPulse stores non-technical articles and videos, but only non-video items evaluated as technically relevant can be selected by future Topic Discovery. Later Topic Discovery and Ranking—not this gate—will assess content value, profile relevance, and priority. The semantic gate handles ambiguous search matches such as React.js versus biological reactivation, Java versus the island, Spring Boot versus the season, and Apache Kafka versus Franz Kafka without keyword blacklists.

Apply the latest Prisma migration, configure the existing OpenAI environment variables, and run:

```bash
npm run relevance:evaluate
```

The command selects unevaluated non-video items, sends title and existing summary metadata to `gpt-5.4-nano` in batches of 25, validates strict Structured Outputs, persists the result, and records usage through the shared AI boundary. A score of at least 6, a positive model assessment, and a category other than `NON_SOFTWARE` are required for eligibility. Evaluated records are skipped on later runs, so they are not charged again.

Developers can deliberately overwrite existing evaluations or bound a manual sample:

```bash
npm run relevance:evaluate -- --force
npm run relevance:evaluate -- --limit=10
```

Videos remain stored but are never sent to this classifier. The command does not fetch article bodies, summarize content, transcribe video, or perform Topic Discovery.

## OpenAI integration foundation

AI stages must call the shared server-side boundary in `src/lib/ai` instead of constructing SDK clients in feature modules. The boundary supports a default model with an optional per-request override, optional strict JSON-schema Structured Outputs, and a required task-appropriate `maxOutputTokens` value. It records the feature, model, input/output tokens, estimated cost, duration, status, and request time in `AiUsage`; prompts and model responses are not persisted.

Configure the integration in `.env`:

```env
OPENAI_API_KEY=your-key-here
OPENAI_DEFAULT_MODEL=gpt-4o-mini
AI_MONTHLY_BUDGET_USD=5
```

All three values are required before an AI request. `OPENAI_API_KEY` is read only by server-side code. `AI_MONTHLY_BUDGET_USD` is an application-side safeguard: before a request, StackPulse sums successful estimated usage in the current UTC calendar month and refuses the call when spending has reached the budget. It does not replace provider-side billing limits, and a request that begins below the budget can exceed the remaining amount because its final token usage is not known in advance.

Supported prices live in one local pricing table and are expressed per million input/output tokens. Unknown models fail explicitly. Pricing is not fetched at runtime and must be reviewed manually whenever OpenAI changes its prices.

After applying migrations, verify the infrastructure manually with an intentionally small request:

```bash
npm run ai:smoke
```

The smoke command requires a real API key, uses a 16-token output limit, persists usage, and prints a concise response, token count, and cost estimate. It is only an integration check and does not perform topic ranking.

## Topic Discovery and Ranking

The stages remain deliberately separate:

```text
Technical Relevance -> broad software/computing eligibility
Topic Discovery     -> semantic grouping of eligible SourceItems
Topic Ranking       -> prioritization as technical content opportunities
Topic Research      -> future deeper factual research before writing
```

Topic Discovery reuses the existing eligibility query: candidates must be non-video, evaluated by the Technical Relevance Gate, marked technically eligible, and published within the configured lookback. It never queries unevaluated SourceItems, fetches pages, or sends article bodies. One execution sends at most the configured item count and returns at most the configured topic count.

```env
TOPIC_DISCOVERY_LOOKBACK_DAYS=7
TOPIC_DISCOVERY_MAX_ITEMS=50
TOPIC_DISCOVERY_MAX_TOPICS=10
TOPIC_DISCOVERY_INTERESTS="React,TypeScript,Java,Spring Boot,PostgreSQL,distributed systems,Kafka,AWS,AI engineering"
```

```bash
npm run topics:discover
npm run topics:discover -- --limit=10
```

The stage uses `gpt-5.4-nano`, strict Structured Outputs, and a 3,000-token maximum output. It ranks profile relevance, technical depth, freshness, practical/content value, discussion potential, source strength, and novelty/significance. Topics persist with component scores and an explicit many-to-many relationship to supporting SourceItems. A deterministic signature of sorted supporting SourceItem IDs makes an exact repeat update the same Topic; it does not perform semantic historical deduplication when a later run groups a different support set.

All calls pass through the shared budget, pricing, output-token, and `AiUsage` boundary. This stage does not generate hooks, angles, posts, or Topic Research.
