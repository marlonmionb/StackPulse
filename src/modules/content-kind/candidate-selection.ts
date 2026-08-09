import type { Prisma } from "@prisma/client";
import { ContentType, type ContentType as ContentTypeValue } from "@/modules/ingestion/content-type";

type CandidateState = {
  title: string;
  contentType: ContentTypeValue;
  technicalRelevant: boolean | null;
  technicalRelevanceEvaluatedAt: Date | null;
  contentKindEvaluatedAt: Date | null;
  metadataEnrichmentStatus: "PENDING" | "ENRICHED" | "NO_METADATA" | "FAILED";
  metadataEnrichmentAttemptedAt: Date | null;
};

type ContentKindFreshnessState = Pick<CandidateState,
  "contentKindEvaluatedAt" | "metadataEnrichmentStatus" | "metadataEnrichmentAttemptedAt"
>;

export function isContentKindClassificationStale(item: ContentKindFreshnessState): boolean {
  return (
    item.contentKindEvaluatedAt !== null &&
    item.metadataEnrichmentStatus === "ENRICHED" &&
    item.metadataEnrichmentAttemptedAt !== null &&
    item.metadataEnrichmentAttemptedAt > item.contentKindEvaluatedAt
  );
}

export function isContentKindCandidate(item: CandidateState, force = false): boolean {
  return (
    item.contentType !== ContentType.VIDEO &&
    item.title.trim().length > 0 &&
    item.technicalRelevanceEvaluatedAt !== null &&
    item.technicalRelevant === true &&
    (force || item.contentKindEvaluatedAt === null || isContentKindClassificationStale(item))
  );
}

export function buildContentKindCandidateWhere(force: boolean): Prisma.SourceItemWhereInput {
  return {
    contentType: { not: ContentType.VIDEO },
    title: { not: "" },
    technicalRelevanceEvaluatedAt: { not: null },
    technicalRelevant: true,
    ...(force
      ? {}
      : {
          OR: [
            { contentKindEvaluatedAt: null },
            {
              metadataEnrichmentStatus: "ENRICHED",
              metadataEnrichmentAttemptedAt: { not: null },
              contentKindEvaluatedAt: { not: null },
            },
          ],
        }),
  };
}
