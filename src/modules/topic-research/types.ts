import type { ContentKind, TechnicalCategory, TopicStatus } from "@prisma/client";
import type { AiExecutionUsage } from "@/lib/ai";

export type TopicResearchSeedSource = {
  id: string; title: string; url: string; canonicalUrl: string | null; source: string;
  summary: string | null; publishedAt: Date | null; contentKind: ContentKind | null;
  technicalCategory: TechnicalCategory | null;
  contentType: "ARTICLE" | "VIDEO" | "UNKNOWN"; technicalRelevant: boolean | null;
  technicalRelevanceEvaluatedAt: Date | null; contentKindEvaluatedAt: Date | null;
  metadataEnrichmentStatus: "PENDING" | "ENRICHED" | "NO_METADATA" | "FAILED";
  metadataEnrichmentAttemptedAt: Date | null;
};

export type TopicForResearch = {
  id: string; title: string; description: string | null; rankingReason: string | null;
  score: number | null; profileRelevanceScore: number | null; technicalDepthScore: number | null;
  freshnessScore: number | null; contentPotentialScore: number | null; status: TopicStatus;
  sourceItems: TopicResearchSeedSource[]; researchCount: number;
};

export type EvidenceReference = { text: string; sourceIds: string[] };
export type KeyFinding = EvidenceReference & { confidence: "HIGH" | "MEDIUM" | "LOW" };
export type ResearchSource = {
  id: string; title: string; url: string; canonicalUrl: string; publisher: string | null;
  domain: string; publishedAt: Date | null; type: "PRIMARY" | "SECONDARY";
};
export type RawResearchEvidence = {
  title: string; url: string; publisher: string | null; publishedAt: Date | null;
  evidence: string | null; origin: "TOPIC_SEED" | "WEB_SEARCH";
};
export type ConsolidatedResearchEvidence = Omit<ResearchSource, "type"> & {
  evidence: string | null; origin: "TOPIC_SEED" | "WEB_SEARCH" | "TOPIC_SEED_AND_WEB_SEARCH";
};
export type SourceAssessment = { sourceId: string; type: "PRIMARY" | "SECONDARY" };
export type ValidatedResearchReport = {
  summary: string; whyItMatters: string; keyFindings: KeyFinding[];
  technicalDetails: EvidenceReference[]; tradeoffs: EvidenceReference[];
  practicalImplications: EvidenceReference[]; openQuestions: string[];
  limitations: string[]; sources: ResearchSource[];
};

export type TopicResearchResult = {
  skipped: boolean; topic: TopicForResearch; researchId: string | null;
  report: ValidatedResearchReport | null; usage: AiExecutionUsage | null;
};
