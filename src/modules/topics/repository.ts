import { createHash } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { buildTopicDiscoveryCandidateWhere } from "./candidate-selection";
import type { DiscoveredTopic, PersistedDiscoveredTopic, TopicDiscoveryCandidate } from "./types";

export type FindTopicCandidatesOptions = { publishedAfter: Date; limit: number };

export type TopicDiscoveryRepository = {
  findCandidates(options: FindTopicCandidatesOptions): Promise<TopicDiscoveryCandidate[]>;
  persistTopics(topics: DiscoveredTopic[], discoveredAt: Date): Promise<PersistedDiscoveredTopic[]>;
};

export function createDiscoverySignature(sourceItemIds: readonly string[]): string {
  return createHash("sha256").update([...new Set(sourceItemIds)].sort().join("\n")).digest("hex");
}

export const topicDiscoveryRepository: TopicDiscoveryRepository = {
  async findCandidates({ publishedAfter, limit }) {
    return prisma.sourceItem.findMany({
      where: buildTopicDiscoveryCandidateWhere({ publishedAfter }),
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: limit,
      select: {
        id: true, title: true, url: true, source: true, summary: true,
        publishedAt: true, technicalCategory: true, technicalRelevanceScore: true,
      },
    });
  },

  async persistTopics(topics, discoveredAt) {
    const rows = await prisma.$transaction(
      topics.map((topic) => {
        const discoverySignature = createDiscoverySignature(topic.sourceItemIds);
        const values = {
          title: topic.title,
          description: topic.description,
          score: topic.overallScore,
          profileRelevanceScore: topic.profileRelevanceScore,
          technicalDepthScore: topic.technicalDepthScore,
          freshnessScore: topic.freshnessScore,
          contentPotentialScore: topic.contentPotentialScore,
          rankingReason: topic.rankingReason,
          discoveredAt,
        };
        return prisma.topic.upsert({
          where: { discoverySignature },
          create: {
            ...values,
            discoverySignature,
            sourceItems: { create: topic.sourceItemIds.map((sourceItemId) => ({ sourceItemId })) },
          },
          update: {
            ...values,
            sourceItems: {
              deleteMany: {},
              create: topic.sourceItemIds.map((sourceItemId) => ({ sourceItemId })),
            },
          },
        });
      }),
    );
    return rows.map((row, index) => ({
      ...topics[index], id: row.id, discoverySignature: row.discoverySignature!,
    }));
  },
};
