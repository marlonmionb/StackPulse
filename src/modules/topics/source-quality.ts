import type { ContentKind } from "@/modules/content-kind/constants";

export const STRONG_TOPIC_DISCOVERY_CONTENT_KINDS = [
  "TECHNICAL_ARTICLE", "TECHNICAL_NEWS", "OFFICIAL_TECHNICAL", "RESEARCH",
] as const satisfies readonly ContentKind[];

export const SUPPORTING_TOPIC_DISCOVERY_CONTENT_KINDS = [
  "REPOSITORY", "DISCUSSION",
] as const satisfies readonly ContentKind[];

export const EXCLUDED_TOPIC_DISCOVERY_CONTENT_KINDS = [
  "PRODUCT_PAGE", "OTHER",
] as const satisfies readonly ContentKind[];

export const TOPIC_DISCOVERY_ELIGIBLE_CONTENT_KINDS = [
  ...STRONG_TOPIC_DISCOVERY_CONTENT_KINDS,
  ...SUPPORTING_TOPIC_DISCOVERY_CONTENT_KINDS,
] as const satisfies readonly ContentKind[];

export type TopicDiscoverySourceStrength = "STRONG" | "SUPPORTING";

export function topicDiscoverySourceStrength(contentKind: ContentKind): TopicDiscoverySourceStrength | null {
  if ((STRONG_TOPIC_DISCOVERY_CONTENT_KINDS as readonly ContentKind[]).includes(contentKind)) return "STRONG";
  if ((SUPPORTING_TOPIC_DISCOVERY_CONTENT_KINDS as readonly ContentKind[]).includes(contentKind)) return "SUPPORTING";
  return null;
}

export function isContentKindEligibleForTopicDiscovery(contentKind: ContentKind | null): boolean {
  return contentKind !== null && topicDiscoverySourceStrength(contentKind) !== null;
}
