import { TOPIC_RESEARCH_MAX_SEED_SOURCES, TOPIC_RESEARCH_MAX_SOURCES, TOPIC_RESEARCH_MAX_SUMMARY_LENGTH } from "./constants";
import type { ConsolidatedResearchEvidence, TopicForResearch } from "./types";

function topicContext(topic: TopicForResearch) {
  const sources = topic.sourceItems.slice(0, TOPIC_RESEARCH_MAX_SEED_SOURCES).map((item) => ({
    sourceItemId: item.id, title: item.title, summary: item.summary?.slice(0, TOPIC_RESEARCH_MAX_SUMMARY_LENGTH),
    url: item.canonicalUrl ?? item.url, publishedAt: item.publishedAt?.toISOString(), source: item.source,
    domain: (() => { try { return new URL(item.url).hostname; } catch { return undefined; } })(),
    contentKind: item.contentKind, technicalCategory: item.technicalCategory,
  }));
  return {
    id: topic.id, title: topic.title, description: topic.description, rankingReason: topic.rankingReason,
    scores: { overall: topic.score, profileRelevance: topic.profileRelevanceScore, technicalDepth: topic.technicalDepthScore, freshness: topic.freshnessScore, contentPotential: topic.contentPotentialScore },
    supportingSourceItems: sources,
  };
}

const STAGE_BOUNDARIES = `Keep stage responsibilities separate:
- ContentType: physical/basic format.
- Technical Relevance: whether material is about software/computing.
- ContentKind: editorial/source kind.
- Topic Discovery: which technical opportunities are represented.
- Topic Ranking: which opportunities deserve priority.
- Topic Research (this task): what reliable evidence and technical understanding support this selected Topic.
- Future Angle Generation: what perspective the author should take (do not do this).
- Future Draft Generation: how a post should be written (do not do this).`;

export function buildTopicResearchEvidencePrompt(topic: TopicForResearch, maxWebSearchCalls: number): string {
  return `Collect GROUNDED WEB EVIDENCE for the one explicitly human-selected Topic below.

${STAGE_BOUNDARIES}

Use Web Search for approximately 2-${maxWebSearchCalls} bounded calls. Return only a concise research narrative containing useful factual observations and uncertainty. Do not return, reproduce, normalize, or propose source URLs, Markdown links, source records, or research source IDs. The application obtains the authoritative web source list exclusively from provider-returned Web Search metadata, then validates, canonicalizes, deduplicates, and assigns internal IDs.

Prefer specifications, official documentation, release notes, primary project announcements, repositories/releases, RFCs, and original research; then credible engineering publications and high-quality independent analysis. Avoid SEO farms, rewrites, unsupported social posts, and promotional copy as the main evidence. Product pages are valid only as evidence of what a vendor says or offers. Preserve reliable disagreement and uncertainty. Do not invent facts, benchmarks, quotes, adoption, or trends. Return only the strict narrative Structured Output.

Selected Topic and bounded seed context:
${JSON.stringify(topicContext(topic))}`;
}

export function buildTopicResearchSynthesisPrompt(topic: TopicForResearch, evidence: readonly ConsolidatedResearchEvidence[], researchNarrative = "No additional Web Search narrative was supplied."): string {
  const synthesisEvidence = evidence.map((source) => ({
    id: source.id, title: source.title, url: source.canonicalUrl, publisher: source.publisher,
    domain: source.domain, publishedAt: source.publishedAt?.toISOString() ?? null,
    origin: source.origin, evidence: source.evidence,
  }));

  return `Synthesize the final GROUNDED TOPIC RESEARCH brief for the one explicitly human-selected Topic below.

${STAGE_BOUNDARIES}

Web Search is complete. Do not search again. Use only the supplied, already canonicalized and deduplicated evidence set of at most ${TOPIC_RESEARCH_MAX_SOURCES} sources. Each source has an application-assigned internal ID such as s1 or s2. Cite only those exact IDs in each item's sourceIds field; do not embed citation markers in prose, never use a URL as a source ID, and do not return a source list or any new URLs.

Product pages are valid only as primary evidence of what a vendor says or offers. Phrase marketing metrics and performance claims explicitly as vendor claims unless independent evidence corroborates them. Do not treat a product page as independent proof of performance, adoption, market trends, quality, or technical correctness.

Source provenance classification rules:
- Return exactly one sourceAssessment for every supplied source ID. Classify provenance independently from how StackPulse discovered the source: WEB_SEARCH does not imply SECONDARY, and TOPIC_SEED does not imply PRIMARY.
- PRIMARY means original or first-party evidence relative to this Topic: official specifications or standards, official technical or SDK documentation, official release notes, a project's own repository/README/announcement, original research papers, and original project/vendor benchmarks or publications.
- SECONDARY means independent reporting, explanation, interpretation, tutorials, reviews, ecosystem commentary, or analysis of someone else's work.
- Official PostgreSQL documentation, official MCP TypeScript SDK documentation, or an official project repository found through Web Search is PRIMARY. An independent engineering article attached as a Topic seed is SECONDARY. An original academic paper is PRIMARY; an article explaining that paper is SECONDARY.
- A vendor product page is PRIMARY evidence for what that vendor says or offers, but PRIMARY is not a quality or truth score. Continue to attribute vendor claims and require independent evidence for broader performance or adoption claims. An independent benchmark evaluating a project is SECONDARY relative to that project, while the project's own benchmark is PRIMARY evidence of its reported result.
- This is one coarse source-level provenance assessment relative to the Topic. Claim-level citation rules below still determine whether a source supports a particular statement.

Evidence attribution rules:
- Every factual claim must be supported by every source ID needed for its material factual parts.
- When a claim concerns a specific project, product, library, framework, company, vendor, repository, implementation, benchmark, release, or author, cite at least one source that directly supports that entity-specific fact. Generic technical documentation cannot substitute for project- or entity-specific evidence.
- Compound claims require compound evidence. If one source supports what a project does and another supports the general technology semantics or consequence, cite both sources. Never cite one generic source for a compound statement when it supports only one part.
- Attribute vendor and project claims precisely. A vendor page supports "Vendor X reports a 40% improvement," but "Vendor X improves performance by 40%" requires suitable independent evidence. Preserve the existing distinction between vendor claims and independently established facts.
- When evidence cannot support a broad combined claim, produce multiple narrower findings with precise citations instead of one partially supported statement. Evidence precision is more important than fewer bullets.
- Distinguish sourced facts from analytical interpretation. Interpretations are allowed, but cite all factual premises used to derive them. Purely editorial wording needs no citation, while its factual justification does.
- Confidence must reflect support directness, not only source quality. Indirect evidence, inference across sources, or incomplete project documentation should not receive HIGH confidence merely because the sources are reputable. HIGH generally requires direct evidence for the material factual claim.

Citation examples:
1. Evidence s1 is Foo project documentation and s2 is PostgreSQL documentation. For "Foo requires Serializable isolation," use sourceIds ["s1"], not ["s2"].
2. For "Foo uses Serializable isolation, which can require transaction retries after serialization failures," use sourceIds ["s1", "s2"] because s1 supports what Foo uses and s2 supports PostgreSQL retry behavior.
3. If s1 is a vendor marketing page and s2 is an independent benchmark, "Vendor X reports a 40% improvement" may cite ["s1"]. The unqualified claim "Vendor X improves performance by 40%" requires independent evidence such as s2.
4. If s1 is a repository README describing an implementation and s2 is generic framework documentation, "The project stores state transitions atomically" must include s1.
5. For "Interlock requires Read Committed, which uses a new snapshot for each command," cite both the Interlock source and PostgreSQL documentation. If the combined evidence is weak, split it into two narrower findings.

Produce a factual engineering brief: what happened, how it works, implementation details, trade-offs, practical implications, uncertainty, supporting evidence, and what needs more research. Do not write a hook, hashtags, angle, LinkedIn post, or draft. Do not invent facts, benchmarks, quotes, personal experience, adoption, or trends.

Every key finding, technical detail, tradeoff, and practical implication must cite at least one supplied internal source ID. Confidence is evidence quality: HIGH for direct strong primary or multiple strong independent evidence; MEDIUM for credible but incomplete/indirect/single-source evidence; LOW for limited/conflicting/ambiguous evidence. Return only the strict synthesis Structured Output.

Selected Topic:
${JSON.stringify({ id: topic.id, title: topic.title, description: topic.description, rankingReason: topic.rankingReason })}

Canonical evidence set:
${JSON.stringify(synthesisEvidence)}

Bounded Web Search narrative (research context only; any URL text here does not create an available source):
${researchNarrative}

Do not treat a URL or factual statement in that narrative as independently grounded. Use it only where the canonical evidence set supplies the source ID needed to support the claim.`;
}
