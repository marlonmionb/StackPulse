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

## AI stages

AI should be split into independent, observable tasks rather than implemented as one autonomous agent. Potential stages include:

- topic ranking;
- semantic deduplication when deterministic checks are insufficient;
- topic research;
- angle suggestions;
- draft generation;
- technical review;
- performance analysis.

Different stages may use different models and token budgets. A shared observable OpenAI request boundary now exists, but none of these production AI stages is implemented yet.
