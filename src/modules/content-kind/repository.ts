import { prisma } from "@/lib/db/prisma";
import { buildContentKindCandidateWhere, isContentKindCandidate } from "./candidate-selection";
import type { ContentKindCandidate, ContentKindClassification } from "./types";

export type FindContentKindCandidatesOptions = { force: boolean; limit?: number };
export type ContentKindRepository = {
  findCandidates(options: FindContentKindCandidatesOptions): Promise<ContentKindCandidate[]>;
  persistBatch(classifications: ContentKindClassification[], evaluatedAt: Date): Promise<void>;
};

export const contentKindRepository: ContentKindRepository = {
  async findCandidates({ force, limit }) {
    const rows = await prisma.sourceItem.findMany({
      where: buildContentKindCandidateWhere(force),
      orderBy: { createdAt: "asc" },
      select: {
        id: true, title: true, url: true, source: true, contentType: true, summary: true,
        technicalCategory: true, technicalRelevant: true, technicalRelevanceEvaluatedAt: true,
        contentKindEvaluatedAt: true, metadataEnrichmentStatus: true, metadataEnrichmentAttemptedAt: true,
      },
    });
    return rows.filter((row) => isContentKindCandidate(row, force)).slice(0, limit).map((row) => ({
      id: row.id, title: row.title, url: row.url, source: row.source,
      contentType: row.contentType, summary: row.summary, technicalCategory: row.technicalCategory,
    }));
  },
  async persistBatch(classifications, evaluatedAt) {
    await prisma.$transaction(classifications.map((classification) => prisma.sourceItem.update({
      where: { id: classification.sourceItemId },
      data: {
        contentKind: classification.contentKind,
        contentKindConfidence: classification.confidence,
        contentKindReason: classification.reason,
        contentKindEvaluatedAt: evaluatedAt,
      },
    })));
  },
};
