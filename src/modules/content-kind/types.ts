import type { ContentType } from "@/modules/ingestion/content-type";
import type { TechnicalCategory } from "@/modules/technical-relevance/constants";
import type { ContentKind, ContentKindConfidence } from "./constants";

export type ContentKindCandidate = {
  id: string;
  title: string;
  url: string;
  source: string;
  contentType: ContentType;
  summary: string | null;
  technicalCategory: TechnicalCategory | null;
};

export type ContentKindClassification = {
  sourceItemId: string;
  contentKind: ContentKind;
  confidence: ContentKindConfidence;
  reason: string;
};

export type ContentKindSummary = {
  candidates: number;
  evaluated: number;
  counts: Record<ContentKind, number>;
  aiRequests: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
};
