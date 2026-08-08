import {
  TECHNICAL_RELEVANCE_THRESHOLD,
  type TechnicalCategory,
} from "./constants";

type RelevanceAssessment = {
  relevant: boolean;
  relevanceScore: number;
  category: TechnicalCategory;
};

export function meetsTechnicalRelevanceThreshold(
  assessment: RelevanceAssessment,
): boolean {
  return (
    assessment.relevant &&
    assessment.relevanceScore >= TECHNICAL_RELEVANCE_THRESHOLD &&
    assessment.category !== "NON_SOFTWARE"
  );
}
