import type { TopicStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { isEligibleForTopicDiscovery } from "./candidate-selection";

export type TopicSupportForSelectability = Parameters<typeof isEligibleForTopicDiscovery>[0];

export type TopicSelectability = {
  selectable: boolean;
  label: "SELECTABLE" | "STALE" | "LIFECYCLE_BLOCKED";
  reason: string;
};

const RESEARCHABLE_STATUSES: readonly TopicStatus[] = ["DISCOVERED", "SELECTED", "RESEARCHED"];

export function deriveTopicSelectability(
  status: TopicStatus,
  sourceItems: readonly TopicSupportForSelectability[],
): TopicSelectability {
  if (!RESEARCHABLE_STATUSES.includes(status)) {
    return { selectable: false, label: "LIFECYCLE_BLOCKED", reason: `Topic lifecycle ${status} does not allow research.` };
  }
  if (!sourceItems.some(isEligibleForTopicDiscovery)) {
    return {
      selectable: false,
      label: "STALE",
      reason: "Current supporting SourceItems no longer satisfy the Topic Discovery source-quality policy.",
    };
  }
  return { selectable: true, label: "SELECTABLE", reason: "Current eligible Topic Discovery support exists." };
}

export type ListedTopic = {
  id: string;
  title: string;
  score: number | null;
  status: TopicStatus;
  discoveredAt: Date;
  researchCount: number;
  selectability: TopicSelectability;
};

export async function listTopics(options: { limit: number; includeHistorical: boolean }): Promise<ListedTopic[]> {
  const rows = await prisma.topic.findMany({
    orderBy: [{ score: "desc" }, { discoveredAt: "desc" }],
    include: {
      _count: { select: { researches: true } },
      sourceItems: { select: { sourceItem: { select: {
        contentType: true, technicalRelevant: true, technicalRelevanceEvaluatedAt: true,
        contentKind: true, contentKindEvaluatedAt: true,
        metadataEnrichmentStatus: true, metadataEnrichmentAttemptedAt: true,
      } } } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    score: row.score,
    status: row.status,
    discoveredAt: row.discoveredAt,
    researchCount: row._count.researches,
    selectability: deriveTopicSelectability(row.status, row.sourceItems.map(({ sourceItem }) => sourceItem)),
  })).filter((topic) => options.includeHistorical || topic.selectability.selectable).slice(0, options.limit);
}
