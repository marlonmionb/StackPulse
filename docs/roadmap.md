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
- [x] Reusable content-source contract
- [x] Persistence and exact-URL duplicate handling
- [x] RSS source
- [x] Second-source normalization
- [ ] Improved or semantic deduplication

## AI

- [ ] OpenAI client
- [ ] AI usage and cost tracking
- [ ] Topic ranking
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
