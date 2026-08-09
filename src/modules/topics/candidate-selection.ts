import {
  ContentType,
  type ContentType as ContentTypeValue,
} from "../ingestion/content-type";
import type { Prisma } from "@prisma/client";
import type { ContentKind } from "@/modules/content-kind/constants";
import { isContentKindClassificationStale } from "@/modules/content-kind/candidate-selection";
import { isContentKindEligibleForTopicDiscovery, TOPIC_DISCOVERY_ELIGIBLE_CONTENT_KINDS } from "./source-quality";

type TopicCandidate = {
  contentType: ContentTypeValue;
  technicalRelevant: boolean | null;
  technicalRelevanceEvaluatedAt: Date | null;
  contentKind: ContentKind | null;
  contentKindEvaluatedAt: Date | null;
  metadataEnrichmentStatus: "PENDING" | "ENRICHED" | "NO_METADATA" | "FAILED";
  metadataEnrichmentAttemptedAt: Date | null;
};

export function isEligibleForTopicDiscovery(item: TopicCandidate): boolean {
  return (
    item.contentType !== ContentType.VIDEO &&
    item.technicalRelevanceEvaluatedAt !== null &&
    item.technicalRelevant === true &&
    item.contentKindEvaluatedAt !== null &&
    !isContentKindClassificationStale(item) &&
    isContentKindEligibleForTopicDiscovery(item.contentKind)
  );
}

export function buildTopicDiscoveryCandidateWhere(options: {
  publishedAfter?: Date;
} = {}): Prisma.SourceItemWhereInput {
  return {
    contentType: { not: ContentType.VIDEO },
    technicalRelevanceEvaluatedAt: { not: null },
    technicalRelevant: true,
    contentKindEvaluatedAt: { not: null },
    contentKind: { in: [...TOPIC_DISCOVERY_ELIGIBLE_CONTENT_KINDS] },
    ...(options.publishedAfter
      ? { publishedAt: { gte: options.publishedAfter } }
      : {}),
  };
}
