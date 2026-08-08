import type { TopicDiscoveryCandidate } from "./types";

function hostnameOf(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

export function buildTopicDiscoveryPrompt(
  items: TopicDiscoveryCandidate[],
  interests: readonly string[],
  maxTopics: number,
): string {
  const input = items.map((item) => ({
    id: item.id,
    title: item.title,
    summary: item.summary ?? undefined,
    technicalCategory: item.technicalCategory ?? undefined,
    technicalRelevanceScore: item.technicalRelevanceScore ?? undefined,
    source: item.source,
    publishedAt: item.publishedAt?.toISOString(),
    hostname: hostnameOf(item.url),
  }));

  return `Perform TOPIC DISCOVERY, SEMANTIC GROUPING, AND RANKING over the supplied eligible SourceItems.

The earlier Technical Relevance Gate asked only: "Is this software/computing?" Every supplied item already passed that broad gate. This stage asks: "What meaningful technical topics exist here, and which deserve higher priority as content opportunities for this developer profile?"

Developer profile interests: ${JSON.stringify(interests)}.

Discover at most ${maxTopics} substantive topics. Group multiple SourceItems only when they represent substantially the same technical event, release, discussion, or concept. Group by semantic subject identity, not keyword overlap: a PostgreSQL release and an unrelated PostgreSQL optimization tutorial are separate topics. One SourceItem may support more than one topic only when the supplied metadata clearly supports both.

Rank on a 0-10 scale using profile relevance, technical depth, freshness, practical value for software engineers, potential for meaningful technical discussion, supporting-source strength, and novelty or significance. The overall score is a holistic judgment informed by those criteria; it need not be a mechanical average. Favor substantive engineering subjects over superficial news. Do not optimize for clickbait, generic engagement, motivational content, or controversy. Do not use historical analytics.

Use only supplied metadata. Do not invent facts or imply details not present. Do not fetch or request external material. Do not generate LinkedIn posts, hooks, angles, or draft content. Keep titles, descriptions, and ranking reasons concise. Every topic must cite at least one supplied SourceItem id. Return only the required Structured Output.

Eligible SourceItems:
${JSON.stringify(input)}`;
}
