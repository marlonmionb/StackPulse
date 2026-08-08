import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type {
  PersistedTechnicalRelevanceClassification,
  TechnicalRelevanceCandidate,
} from "./types";

export type FindTechnicalRelevanceCandidatesOptions = {
  force: boolean;
  limit?: number;
};

export type TechnicalRelevanceRepository = {
  findCandidates(
    options: FindTechnicalRelevanceCandidatesOptions,
  ): Promise<TechnicalRelevanceCandidate[]>;
  persistBatch(
    classifications: PersistedTechnicalRelevanceClassification[],
    evaluatedAt: Date,
  ): Promise<void>;
};

export function buildTechnicalRelevanceCandidateWhere(
  force: boolean,
): Prisma.SourceItemWhereInput {
  return {
    contentType: { not: "VIDEO" },
    title: { not: "" },
    ...(force ? {} : { technicalRelevanceEvaluatedAt: null }),
  };
}

export const technicalRelevanceRepository: TechnicalRelevanceRepository = {
  async findCandidates({ force, limit }) {
    return prisma.sourceItem.findMany({
      where: buildTechnicalRelevanceCandidateWhere(force),
      orderBy: { createdAt: "asc" },
      take: limit,
      select: {
        id: true,
        title: true,
        url: true,
        source: true,
        contentType: true,
        summary: true,
        publishedAt: true,
      },
    });
  },

  async persistBatch(classifications, evaluatedAt) {
    await prisma.$transaction(
      classifications.map((classification) =>
        prisma.sourceItem.update({
          where: { id: classification.sourceItemId },
          data: {
            technicalRelevant: classification.technicalRelevant,
            technicalRelevanceScore: classification.relevanceScore,
            technicalCategory: classification.category,
            technicalRelevanceReason: classification.reason,
            technicalRelevanceEvaluatedAt: evaluatedAt,
          },
        }),
      ),
    );
  },
};
