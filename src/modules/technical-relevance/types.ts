import type { ContentType } from "@/modules/ingestion/content-type";
import type { TechnicalCategory } from "./constants";

export type TechnicalRelevanceCandidate = {
  id: string;
  title: string;
  url: string;
  source: string;
  contentType: ContentType;
  summary: string | null;
  publishedAt: Date | null;
};

export type TechnicalRelevanceClassification = {
  sourceItemId: string;
  relevant: boolean;
  relevanceScore: number;
  category: TechnicalCategory;
  reason: string;
};

export type PersistedTechnicalRelevanceClassification =
  TechnicalRelevanceClassification & {
    technicalRelevant: boolean;
  };

export type TechnicalRelevanceSummary = {
  candidates: number;
  evaluated: number;
  relevant: number;
  rejected: number;
  aiRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
  rejectedTitles: string[];
};
