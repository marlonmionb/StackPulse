import {
  ContentType,
  type ContentType as ContentTypeValue,
} from "../ingestion/content-type";
import type { Prisma } from "@prisma/client";

type TopicCandidate = {
  contentType: ContentTypeValue;
  technicalRelevant: boolean | null;
  technicalRelevanceEvaluatedAt: Date | null;
};

export function isEligibleForTopicDiscovery(item: TopicCandidate): boolean {
  return (
    item.contentType !== ContentType.VIDEO &&
    item.technicalRelevanceEvaluatedAt !== null &&
    item.technicalRelevant === true
  );
}

export function buildTopicDiscoveryCandidateWhere(options: {
  publishedAfter?: Date;
} = {}): Prisma.SourceItemWhereInput {
  return {
    contentType: { not: ContentType.VIDEO },
    technicalRelevanceEvaluatedAt: { not: null },
    technicalRelevant: true,
    ...(options.publishedAfter
      ? { publishedAt: { gte: options.publishedAfter } }
      : {}),
  };
}
