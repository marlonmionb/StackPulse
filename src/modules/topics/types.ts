import type { TechnicalCategory } from "@/modules/technical-relevance/constants";

export type TopicDiscoveryCandidate = {
  id: string;
  title: string;
  url: string;
  source: string;
  summary: string | null;
  publishedAt: Date | null;
  technicalCategory: TechnicalCategory | null;
  technicalRelevanceScore: number | null;
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
