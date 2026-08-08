import { ContentType, type ContentType as ContentTypeValue } from "@/modules/ingestion/content-type";

type CandidateState = {
  title: string;
  contentType: ContentTypeValue;
  technicalRelevanceEvaluatedAt: Date | null;
};

export function isTechnicalRelevanceCandidate(
  item: CandidateState,
  force = false,
): boolean {
  return (
    item.contentType !== ContentType.VIDEO &&
    item.title.trim().length > 0 &&
    (force || item.technicalRelevanceEvaluatedAt === null)
  );
}
