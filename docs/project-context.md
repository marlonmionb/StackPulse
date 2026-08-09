# Project context

## Problem

Developers consume information from Hacker News, RSS feeds, GitHub releases, technical blogs, and potentially Reddit and other APIs. StackPulse should reduce this information overload by collecting, filtering, ranking, and transforming relevant signals into useful content ideas.

The initial use case is technical LinkedIn content for professional visibility and knowledge sharing. The system is not intended to autonomously impersonate the author: AI acts as an assistant, and publication always requires explicit human review and approval.

## Expected product flow

```text
External Sources
    ↓
Ingestion
    ↓
Normalization
    ↓
Deduplication
    |
    v
Content Type Classification
    |
    v
Metadata Enrichment
    |
    v
Technical Relevance Gate
    ↓
Content Kind Classification
    ↓
Topic Discovery / Ranking
    ↓
Topic Research
    ↓
Angle Suggestions
    ↓
Draft Generation
    ↓
Human Review / Editing
    ↓
Approval
    ↓
Publishing
    ↓
Analytics
    ↓
Historical Feedback
```

Analytics may eventually enrich future topic ranking. The product must also support a cold start with no historical performance data.

Ingestion discovers and stores normalized source data. Metadata enrichment is a separate deterministic stage that may add lightweight page description metadata to summary-poor articles. It does not scrape article bodies, execute page JavaScript, use AI, summarize, or support video transcription. Technical Relevance remains the independent semantic software/computing classifier. Content Kind separately identifies whether a technically relevant page is an article, technical news, official technical material, research, a repository, product marketing, discussion, or other source material.

## AI stages

AI should be split into independent, observable tasks rather than implemented as one autonomous agent. The technical relevance classifier is the first implemented production stage. Stages include:

- technical relevance classification;
- content-kind classification;
- topic ranking;
- semantic deduplication when deterministic checks are insufficient;
- topic research;
- angle suggestions;
- draft generation;
- technical review;
- performance analysis.

Different stages may use different models and token budgets. All use the shared observable OpenAI request boundary. Ingested content is not automatically AI eligible: non-software matches and videos remain stored while being excluded from Topic Discovery. Technically relevant product and miscellaneous pages also remain stored, but cannot independently seed Topic Discovery. Topic Discovery semantically groups source-quality-eligible items and ranks opportunities for the centralized developer profile. Topic Research remains a future, independent factual-research stage before writing.

The domain questions remain distinct:

- Content Type: what physical/basic format is the URL?
- Technical Relevance: is the material about software or computing?
- Content Kind: what editorial/source kind of page is it?
- Topic Discovery: what meaningful technical opportunities are supported by suitable sources?
- Topic Ranking: which opportunities deserve priority?
- Future Topic Research: independently verify and deepen a human-selected Topic.
