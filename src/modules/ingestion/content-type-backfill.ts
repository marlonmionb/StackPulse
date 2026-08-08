import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { ContentType, detectContentType } from "./content-type";

export type ContentTypeBackfillOptions = {
  limit?: number;
};

export type ContentTypeBackfillSummary = {
  candidates: number;
  articles: number;
  videos: number;
  stillUnknown: number;
};

type ContentTypeBackfillCandidate = {
  id: string;
  url: string;
};

export type ContentTypeBackfillRepository = {
  findCandidates(limit?: number): Promise<ContentTypeBackfillCandidate[]>;
  updateIfUnknown(
    id: string,
    contentType: typeof ContentType.ARTICLE | typeof ContentType.VIDEO,
  ): Promise<boolean>;
};

export function buildContentTypeBackfillCandidateWhere(): Prisma.SourceItemWhereInput {
  return { contentType: ContentType.UNKNOWN };
}

export const contentTypeBackfillRepository: ContentTypeBackfillRepository = {
  async findCandidates(limit) {
    return prisma.sourceItem.findMany({
      where: buildContentTypeBackfillCandidateWhere(),
      orderBy: { createdAt: "asc" },
      take: limit,
      select: { id: true, url: true },
    });
  },

  async updateIfUnknown(id, contentType) {
    const result = await prisma.sourceItem.updateMany({
      where: { id, contentType: ContentType.UNKNOWN },
      data: { contentType },
    });
    return result.count === 1;
  },
};

export async function backfillContentTypes(
  options: ContentTypeBackfillOptions = {},
  repository: ContentTypeBackfillRepository = contentTypeBackfillRepository,
): Promise<ContentTypeBackfillSummary> {
  if (
    options.limit !== undefined &&
    (!Number.isInteger(options.limit) || options.limit <= 0)
  ) {
    throw new RangeError("Content type backfill limit must be a positive integer.");
  }

  const candidates = await repository.findCandidates(options.limit);
  const summary: ContentTypeBackfillSummary = {
    candidates: candidates.length,
    articles: 0,
    videos: 0,
    stillUnknown: 0,
  };

  for (const candidate of candidates) {
    const contentType = detectContentType(candidate.url);
    if (contentType === ContentType.UNKNOWN) {
      summary.stillUnknown += 1;
      continue;
    }

    const updated = await repository.updateIfUnknown(candidate.id, contentType);
    if (!updated) continue;

    if (contentType === ContentType.ARTICLE) summary.articles += 1;
    if (contentType === ContentType.VIDEO) summary.videos += 1;
  }

  return summary;
}
