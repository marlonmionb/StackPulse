import { canonicalizeUrl } from "@/modules/ingestion/deduplication";
import { TOPIC_RESEARCH_MAX_SEED_SOURCES, TOPIC_RESEARCH_MAX_SOURCES, TOPIC_RESEARCH_MAX_SUMMARY_LENGTH } from "./constants";
import type { TopicForResearch } from "./types";

export function seedUrls(topic: TopicForResearch): string[] {
  return topic.sourceItems.slice(0, TOPIC_RESEARCH_MAX_SEED_SOURCES).flatMap((item) => {
    try { return [canonicalizeUrl(item.canonicalUrl ?? item.url)]; } catch { return []; }
  });
}

export function buildTopicResearchPrompt(topic: TopicForResearch, maxWebSearchCalls: number): string {
  const sources = topic.sourceItems.slice(0, TOPIC_RESEARCH_MAX_SEED_SOURCES).map((item) => ({
    id: item.id, title: item.title, summary: item.summary?.slice(0, TOPIC_RESEARCH_MAX_SUMMARY_LENGTH),
    url: item.canonicalUrl ?? item.url, publishedAt: item.publishedAt?.toISOString(), source: item.source,
    domain: (() => { try { return new URL(item.url).hostname; } catch { return undefined; } })(),
    contentKind: item.contentKind, technicalCategory: item.technicalCategory,
  }));
  const topicContext = {
    id: topic.id, title: topic.title, description: topic.description, rankingReason: topic.rankingReason,
    scores: { overall: topic.score, profileRelevance: topic.profileRelevanceScore, technicalDepth: topic.technicalDepthScore, freshness: topic.freshnessScore, contentPotential: topic.contentPotentialScore },
    supportingSourceItems: sources,
  };

  return `Perform GROUNDED TOPIC RESEARCH for the one explicitly human-selected Topic below.

Keep stage responsibilities separate:
- ContentType: physical/basic format.
- Technical Relevance: whether material is about software/computing.
- ContentKind: editorial/source kind.
- Topic Discovery: which technical opportunities are represented.
- Topic Ranking: which opportunities deserve priority.
- Topic Research (this task): what reliable evidence and technical understanding support this selected Topic.
- Future Angle Generation: what perspective the author should take (do not do this).
- Future Draft Generation: how a post should be written (do not do this).

Use Web Search for approximately 2-${maxWebSearchCalls} bounded calls and return no more than ${TOPIC_RESEARCH_MAX_SOURCES} genuinely useful sources. Prefer specifications, official documentation, release notes, primary project announcements, repositories/releases, RFCs, and original research; then credible engineering publications and high-quality independent analysis. Avoid SEO farms, rewrites, unsupported social posts, and promotional copy as the main evidence. Preserve reliable disagreement and uncertainty.

Product pages are valid only as primary evidence of what a vendor says or offers. Phrase marketing metrics and performance claims explicitly as vendor claims unless independent evidence corroborates them. Do not treat a product page as independent proof of performance, adoption, market trends, quality, or technical correctness.

Produce a factual engineering brief: what happened, how it works, implementation details, trade-offs, practical implications, uncertainty, supporting evidence, and what needs more research. Do not write a hook, hashtags, angle, LinkedIn post, or draft. Do not invent facts, benchmarks, quotes, personal experience, adoption, or trends.

Every key finding, technical detail, tradeoff, and practical implication must cite at least one source id from sources. Confidence is evidence quality: HIGH for direct strong primary or multiple strong independent evidence; MEDIUM for credible but incomplete/indirect/single-source evidence; LOW for limited/conflicting/ambiguous evidence. Use only URLs from the supplied seed context or URLs actually surfaced by Web Search. Return only the strict Structured Output.

Selected Topic and bounded seed context:
${JSON.stringify(topicContext)}`;
}
