import { prisma } from "@/lib/db/prisma";
import type { AiExecutionUsage } from "@/lib/ai";
import type { TopicForResearch, ValidatedResearchReport } from "./types";

export type TopicResearchRepository = {
  findTopic(topicId: string): Promise<TopicForResearch | null>;
  markSelected(topicId: string): Promise<void>;
  persist(topicId: string, report: ValidatedResearchReport, usage: AiExecutionUsage, researchedAt: Date): Promise<string>;
};

export const topicResearchRepository: TopicResearchRepository = {
  async findTopic(topicId) {
    const row = await prisma.topic.findUnique({ where: { id: topicId }, include: {
      _count: { select: { researches: true } },
      sourceItems: { include: { sourceItem: true } },
    } });
    if (!row) return null;
    return {
      id: row.id, title: row.title, description: row.description, rankingReason: row.rankingReason,
      score: row.score, profileRelevanceScore: row.profileRelevanceScore, technicalDepthScore: row.technicalDepthScore,
      freshnessScore: row.freshnessScore, contentPotentialScore: row.contentPotentialScore, status: row.status,
      sourceItems: row.sourceItems.map(({ sourceItem }) => sourceItem), researchCount: row._count.researches,
    };
  },
  async markSelected(topicId) {
    await prisma.topic.updateMany({ where: { id: topicId, status: "DISCOVERED" }, data: { status: "SELECTED" } });
  },
  async persist(topicId, report, usage, researchedAt) {
    return prisma.$transaction(async (tx) => {
      const research = await tx.topicResearch.create({ data: {
        topicId, summary: report.summary, whyItMatters: report.whyItMatters,
        keyFindings: report.keyFindings, technicalDetails: report.technicalDetails,
        tradeoffs: report.tradeoffs, practicalImplications: report.practicalImplications,
        openQuestions: report.openQuestions, limitations: report.limitations,
        model: usage.model, webSearchCalls: usage.webSearchCalls, inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens, reasoningTokens: usage.reasoningTokens,
        estimatedTokenCostUsd: usage.estimatedTokenCostUsd, estimatedToolCostUsd: usage.estimatedToolCostUsd,
        estimatedTotalCostUsd: usage.estimatedCostUsd, researchedAt,
        sources: { create: report.sources.map((source) => ({
          evidenceId: source.id, title: source.title, url: source.url, canonicalUrl: source.canonicalUrl,
          publisher: source.publisher, domain: source.domain, publishedAt: source.publishedAt, type: source.type,
        })) },
      } });
      await tx.topic.update({ where: { id: topicId }, data: { status: "RESEARCHED" } });
      return research.id;
    });
  },
};
