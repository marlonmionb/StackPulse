# StackPulse

StackPulse is a personal content-intelligence platform for discovering, understanding, and turning technical topics into reviewed content. The current version includes multi-source ingestion, lightweight article metadata enrichment, an AI Technical Relevance Gate, semantic Content Kind classification, bounded source-quality-aware Topic Discovery and ranking, explicit human-selected grounded Topic Research, and a version-controlled Author Profile Context for future editorial personalization. Angle generation, drafting, publishing, authentication, and analytics are not implemented yet.

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
- `src/modules/content-kind`: batched AI editorial/source-nature classification with freshness-aware caching.
- `src/modules/topics`: bounded topic candidate selection, semantic grouping, ranking, current-selectability validation, and persistence.
- `src/modules/topic-research`: explicit single-Topic grounded Web Research, evidence validation, and versioned report persistence.
- `src/modules/author-profile`: deterministic loading and validation of verified author context and claim boundaries for future editorial stages.
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
- [`docs/author-profile.md`](docs/author-profile.md): manually maintained, version-controlled professional context and authorship boundaries.

## Author Profile Context

`docs/author-profile.md` is the prompt-ready source of truth for verified professional experience, personal-project experience, current learning, positioning, content goals, and claims the author may or may not make. It contains professional/technical context only and is not a resume or a store for contact details.

Validate it locally with a deterministic, read-only command:

```bash
npm run author-profile:validate
```

The profile is not stored in Prisma and the command makes no AI calls. Its future boundary is:

```text
TopicResearch factual evidence + AuthorProfile verified author context
                              -> Angle Generation
                              -> human angle selection
                              -> Draft Generation
```

Author Profile context is editorial personalization only. It does not affect Technical Relevance, Content Kind, Topic Discovery, Topic Ranking, or Topic Research factual synthesis. Angle and Draft Generation are not implemented.

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

All three values are required before an AI request. `OPENAI_API_KEY` is read only by server-side code. `AI_MONTHLY_BUDGET_USD` is an application-side safeguard: before a request, StackPulse sums estimated provider cost (tokens plus tools, including failed operations when usage is available) in the current UTC calendar month and refuses the call when spending has reached the budget. It does not replace provider-side billing limits, and a request that begins below the budget can exceed the remaining amount because its final usage is not known in advance.

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
Content Kind        -> editorial/source nature of the page
Topic Discovery     -> semantic grouping of eligible SourceItems
Topic Ranking       -> prioritization as technical content opportunities
Topic Research      -> grounded research only after explicit human selection
```

Run Content Kind after Technical Relevance:

```bash
npm run content-kind:evaluate
npm run content-kind:evaluate -- --limit=20
npm run content-kind:evaluate -- --force --limit=20
```

The classifier uses `gpt-5.4-nano`, batches of 25, a 2,000-token output maximum, and the shared AI usage/budget boundary. It persists nullable Content Kind, confidence, short reason, and evaluation time. Normal runs skip current results; successful metadata enrichment after evaluation makes a result eligible again, and `--force` deliberately re-evaluates selected records.

The controlled taxonomy is `TECHNICAL_ARTICLE`, `TECHNICAL_NEWS`, `OFFICIAL_TECHNICAL`, `RESEARCH`, `REPOSITORY`, `PRODUCT_PAGE`, `DISCUSSION`, and `OTHER`. Content Type remains the physical/basic URL format, Technical Relevance asks whether material concerns software/computing, and Content Kind asks what editorial/source kind the page is.

Topic Discovery candidates must be non-video, technically eligible, Content Kind evaluated, and published within the configured lookback. Technical articles/news, official technical sources, and research are strong seeds. Repositories and discussions remain eligible as supporting-strength signals. Product pages and `OTHER` remain persisted for potential future Topic Research context but are excluded from discovery input and cannot independently create Topics. One execution sends at most the configured item count and returns at most the configured topic count.

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

The stage uses `gpt-5.4-nano`, strict Structured Outputs, and a 3,000-token maximum output. It ranks profile relevance, technical depth, freshness, practical/content value, discussion potential, source quality/independence, and novelty/significance. Its prompt requires a single product/tool/repository source to remain a narrow factual topic and forbids unsupported ecosystem-trend generalization. Topics persist with component scores and an explicit many-to-many relationship to supporting SourceItems. A deterministic signature of sorted supporting SourceItem IDs makes an exact repeat update the same Topic; it does not perform semantic historical deduplication when a later run groups a different support set.

Existing Topics are not deleted or retroactively rewritten. For a safe corrected-behavior benchmark, apply migrations, run Content Kind over a bounded recent sample, then run bounded Topic Discovery and compare its printed ranked titles with the earlier run. Exact support signatures update their existing Topic; different support sets may create new historical Topics. Inspect or archive old local benchmark rows manually rather than adding destructive production behavior.

All calls pass through the shared budget, pricing, output-token, and `AiUsage` boundary. Topic Discovery does not generate hooks, angles, posts, or automatically trigger Topic Research.

## Human Topic Selection and Grounded Topic Research

```text
Topic Discovery & Ranking
        -> current/selectable Topic validation
        -> human explicitly chooses a Topic ID
        -> bounded grounded Web Research
        -> persisted versioned TopicResearch + TopicResearchSource evidence
        -> future Angle Generation
```

List current selectable ranked Topics, or include preserved historical/non-selectable rows explicitly:

```bash
npm run topics:list
npm run topics:list -- --limit=20
npm run topics:list -- --include-historical
```

Selectability is derived from current supporting SourceItems using the centralized Topic Discovery candidate/source-quality policy; it is not a new editorial status. A Topic backed only by `PRODUCT_PAGE`, `OTHER`, or otherwise no-longer-eligible support remains in the database but is marked `STALE` and omitted from the default list. `ARCHIVED` is a separate lifecycle block.

Research exactly one human-selected Topic:

```env
OPENAI_TOPIC_RESEARCH_MODEL=gpt-5.6-terra
TOPIC_RESEARCH_MAX_OUTPUT_TOKENS=4000
TOPIC_RESEARCH_MAX_WEB_SEARCH_CALLS=4
```

```bash
npm run topics:research -- --topic-id=<TOPIC_ID>
npm run topics:research -- --topic-id=<TOPIC_ID> --force
```

The Topic moves from `DISCOVERED` to `SELECTED` when the explicit operation starts and to `RESEARCHED` only after validated evidence and report persistence succeed. A failed attempt may remain `SELECTED`. Existing successful research causes a zero-request skip unless `--force` is supplied; force appends a new report and sources without changing old history.

Topic Research uses two bounded Responses API stages with `gpt-5.6-terra` and medium reasoning. The first performs Web Search under the API-native maximum tool-call bound and returns grounded evidence metadata. TypeScript then canonicalizes seed and Web Search URLs, collapses duplicates, merges metadata, and assigns `s1…sN` internal IDs. The second performs strict Structured synthesis without Web Search and may cite only those IDs. It retains no more than 10 sources and sends no more than 10 bounded seed SourceItems. Arbitrary URLs absent from seed or actual Web Search metadata are rejected before synthesis.

Official specifications, documentation, release notes, primary project sources, repositories/releases, RFCs, and original research are preferred. A product page may support only a clearly attributed vendor/product claim unless independent evidence corroborates it. Product pages remain excluded from Topic Discovery.

Research costs include both model tokens and Web Search tool calls. Pricing is manually maintained in the centralized AI pricing module. The monthly preflight uses estimated total provider cost. A final request may slightly overshoot the remaining application budget because exact final token/tool usage is unknown before execution.

No scheduled or automatic research exists, and no Angle Generation, draft/post generation, or publishing behavior is included.
