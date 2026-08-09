import type { TechnicalCategory } from "@/modules/technical-relevance/constants";
import type { ContentKind } from "@/modules/content-kind/constants";
import type { TopicDiscoverySourceStrength } from "./source-quality";

export type TopicDiscoveryCandidate = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  publishedAt: Date | null;
  technicalCategory: TechnicalCategory | null;
  technicalRelevanceScore: number | null;
  contentKind: ContentKind;
  sourceStrength: TopicDiscoverySourceStrength;
};

export type DiscoveredTopic = {
  title: string;
  description: string;
  overallScore: number;
  profileRelevanceScore: number;
  technicalDepthScore: number;
  freshnessScore: number;
  contentPotentialScore: number;
  rankingReason: string;
  sourceItemIds: string[];
};

export type PersistedDiscoveredTopic = DiscoveredTopic & {
  id: string;
  discoverySignature: string;
};

export type TopicDiscoverySummary = {
  candidates: number;
  topics: PersistedDiscoveredTopic[];
  aiRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};
