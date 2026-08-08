import type { MetadataEnrichmentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { hasUsefulSummary } from "./eligibility";
import type { MetadataEnrichmentCandidate, MetadataEnrichmentResult } from "./types";

export type FindMetadataEnrichmentCandidatesOptions = {
  force: boolean;
  limit?: number;
};

export type MetadataEnrichmentRepository = {
  findCandidates(
    options: FindMetadataEnrichmentCandidatesOptions,
  ): Promise<MetadataEnrichmentCandidate[]>;
  persistResult(
    sourceItemId: string,
    result: MetadataEnrichmentResult,
    attemptedAt: Date,
  ): Promise<boolean>;
};

export function candidateStatuses(force: boolean): MetadataEnrichmentStatus[] {
  return force ? ["PENDING", "NO_METADATA", "FAILED"] : ["PENDING"];
}

export function buildMetadataEnrichmentCandidateWhere(
  force: boolean,
): Prisma.SourceItemWhereInput {
  return {
    contentType: "ARTICLE",
    metadataEnrichmentStatus: { in: candidateStatuses(force) },
  };
}

export const metadataEnrichmentRepository: MetadataEnrichmentRepository = {
  async findCandidates({ force, limit }) {
    const items = await prisma.sourceItem.findMany({
      where: buildMetadataEnrichmentCandidateWhere(force),
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        url: true,
        contentType: true,
        summary: true,
        metadataEnrichmentStatus: true,
      },
    });
    const candidates = items.filter((item) => !hasUsefulSummary(item.summary));
    return limit === undefined ? candidates : candidates.slice(0, limit);
  },

  async persistResult(sourceItemId, result, attemptedAt) {
    return prisma.$transaction(async (transaction) => {
      const current = await transaction.sourceItem.findUnique({
        where: { id: sourceItemId },
        select: { summary: true },
      });
      if (!current || hasUsefulSummary(current.summary)) return false;

      await transaction.sourceItem.update({
        where: { id: sourceItemId },
        data: {
          metadataEnrichmentStatus: result.status,
          metadataEnrichmentAttemptedAt: attemptedAt,
          ...(result.status === "ENRICHED" ? { summary: result.summary } : {}),
        },
      });
      return true;
    });
  },
};
