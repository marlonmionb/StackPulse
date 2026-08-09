# Topic Research

Implements explicit human-selected, bounded grounded research for one currently
selectable Topic. It uses the shared OpenAI Responses API boundary for bounded
Web Search evidence collection followed by deterministic URL consolidation and
no-search Structured synthesis. At most four Web Search calls are allowed, and
only actual Web Search metadata or bounded Topic seed sources can enter the
canonical evidence set. Internal `s1…sN` IDs are assigned only after duplicate
canonical URLs are merged. Reports and sources are
versioned append-only records. It does not generate angles, drafts, posts, or
publishing actions.

For Web Search requests the SDK adapter explicitly requests
`include: ["web_search_call.action.sources"]`. Every URL in the returned search
actions' `sources` arrays is provider-owned evidence metadata. Provider-created
`message.content[].annotations[]` entries of type `url_citation` are also
accepted because SDK 7.4.0 defines them as citations to web resources used by
the response; they can add a cited source or supply its title. Ordinary URLs or
Markdown links in `output_text`, plus `open_page`/`find_in_page` action targets,
do not create evidence sources.

The collection model returns only a bounded research narrative. That narrative
is useful synthesis context but has no authority to create sources. The allowed
set is the union of bounded pre-existing Topic seed URLs and usable HTTP(S)
provider metadata. Application code validates and canonicalizes those URLs,
collapses canonical duplicates, merges metadata, and assigns `s1…sN` before
no-search synthesis. A deeper repository URL is not trusted merely because a
seed is its path prefix or shares its host.

URL grounding and citation grounding are related but distinct. The application
deterministically guarantees that every cited internal ID belongs to the
canonical seed/Web Search evidence set. The synthesis contract separately
requires each source to support the factual claim attributed to it, including
entity-specific and compound claims. Runtime validation enforces citation
structure and source identity; it does not formally prove natural-language
entailment.

Research source metadata has three independent dimensions:

```text
Source
|-- origin: TOPIC_SEED or WEB_SEARCH (how StackPulse found it)
|-- type: PRIMARY or SECONDARY (coarse provenance relative to the Topic)
`-- citations: the specific findings the source supports
```

The existing no-search synthesis response must assess every application-owned
source ID exactly once. Official specifications, documentation, SDK material,
repositories, release notes, and original papers are generally `PRIMARY`, even
when Web Search discovered them. Independent reporting or analysis is generally
`SECONDARY`, even when it was already a Topic seed. The validated assessment is
persisted in `TopicResearchSource.type`; origin never supplies a default type.

`PRIMARY` means first-party or original evidence, not automatically trustworthy
or independently corroborated. Vendor material can be primary evidence of what
the vendor claims while still requiring attribution and independent support for
broader performance or adoption claims. The persisted type is intentionally a
coarse source-level classification; semantic citation grounding remains
claim-specific and is not formally proven by application code.
