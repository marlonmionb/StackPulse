# Roadmap

Checkboxes describe repository state, not planned dates or estimates.

## Foundation

- [x] Project initialization
- [x] TypeScript and Next.js setup
- [x] Prisma configuration
- [x] SQLite database and initial migration
- [x] Initial `SourceItem`, `Topic`, and `Post` models
- [x] Project context documentation

## Ingestion

- [x] Hacker News source
- [x] Hacker News normalization
- [x] Targeted Hacker News Search ingestion
- [x] Reusable content-source contract
- [x] Persistence and exact-URL duplicate handling
- [x] RSS source
- [x] Second-source normalization
- [x] Improved deterministic URL deduplication
- [x] Deterministic content-type classification
- [ ] Semantic deduplication

## Metadata enrichment

- [x] Lightweight HTML description metadata enrichment for summary-poor articles
- [x] Bounded manual enrichment command with explicit retry behavior
- [x] Focused local/private-network URL protections
- [ ] Video transcription or metadata extraction

## AI

- [x] OpenAI client
- [x] AI usage and cost tracking
- [x] Technical relevance classification gate
- [x] Content Kind classification and persisted editorial/source nature
- [x] Topic discovery and semantic grouping
- [x] Profile-aware topic ranking
- [x] ContentKind-aware Topic Discovery source-quality policy
- [x] Persisted Topic-to-SourceItem evidence relationships
- [ ] Topic research
- [ ] Angle suggestions
- [ ] Post draft generation
- [ ] Technical review

## Content workflow

- [ ] Content dashboard
- [ ] Edit draft
- [ ] Approve or reject workflow
- [ ] Enforced post status lifecycle

## Publishing

- [ ] LinkedIn OAuth and integration
- [ ] Manual publishing trigger
- [ ] Safe publishing workflow with explicit approval

## Analytics

- [ ] Analytics import
- [ ] Metrics persistence
- [ ] AI performance analysis
- [ ] Historical feedback into topic ranking

## Infrastructure

- [ ] Scheduled ingestion
- [ ] Production deployment
- [ ] Production secrets and configuration management
- [ ] Observability
