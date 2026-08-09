import { prisma } from "@/lib/db/prisma";
import type { AngleResearch, PersistedContentAngle, SelectedContentAngle, ValidatedContentAngle } from "./types";

export type AngleRepository = {
  findResearch(researchId: string): Promise<AngleResearch | null>;
  persistGeneration(input: {
    research: AngleResearch; generationId: string; authorProfileHash: string; model: string;
    generatedAt: Date; angles: ValidatedContentAngle[];
  }): Promise<PersistedContentAngle[]>;
  list(researchId: string): Promise<PersistedContentAngle[]>;
  select(angleId: string): Promise<SelectedContentAngle | null>;
};

export async function applyExclusiveAngleSelection<T>(
  topicResearchId: string,
  angleId: string,
  operations: { clearSelected(researchId: string): Promise<void>; markSelected(id: string): Promise<T> },
): Promise<T> {
  await operations.clearSelected(topicResearchId);
  return operations.markSelected(angleId);
}

export function supportingSourceConnections(angle: ValidatedContentAngle, research: AngleResearch): { researchSourceId: string }[] {
  const sourceIds = new Map(research.sources.map((source) => [source.id, source.databaseId]));
  return angle.supportingSourceIds.map((evidenceId) => {
    const researchSourceId = sourceIds.get(evidenceId);
    if (!researchSourceId) throw new Error(`Unknown TopicResearchSource evidence ID: ${evidenceId}.`);
    return { researchSourceId };
  });
}

const angleInclude = { supportingSources: { include: { researchSource: true } } } as const;

function persisted(row: {
  id: string; topicResearchId: string; generationId: string; title: string; thesis: string;
  authorConnectionType: PersistedContentAngle["authorConnectionType"]; whyItFitsAuthor: string; fitScore: number;
  requiresHumanInput: boolean; humanInputPrompt: string | null; claimBoundaryNotes: string;
  authorProfileHash: string; status: PersistedContentAngle["status"]; model: string; generatedAt: Date;
  supportingSources: { researchSource: { evidenceId: string } }[];
}): PersistedContentAngle {
  return {
    id: row.id, topicResearchId: row.topicResearchId, generationId: row.generationId,
    title: row.title, thesis: row.thesis, authorConnectionType: row.authorConnectionType,
    whyItFitsAuthor: row.whyItFitsAuthor, supportingSourceIds: row.supportingSources.map(({ researchSource }) => researchSource.evidenceId),
    fitScore: row.fitScore, requiresHumanInput: row.requiresHumanInput, humanInputPrompt: row.humanInputPrompt,
    claimBoundaryNotes: row.claimBoundaryNotes, authorProfileHash: row.authorProfileHash,
    status: row.status, model: row.model, generatedAt: row.generatedAt,
  };
}

export const angleRepository: AngleRepository = {
  async findResearch(researchId) {
    const row = await prisma.topicResearch.findUnique({
      where: { id: researchId },
      include: { topic: true, sources: { orderBy: { evidenceId: "asc" } }, _count: { select: { angles: true } } },
    });
    if (!row) return null;
    return {
      id: row.id, topic: { id: row.topic.id, title: row.topic.title, description: row.topic.description },
      summary: row.summary, whyItMatters: row.whyItMatters, keyFindings: row.keyFindings,
      technicalDetails: row.technicalDetails, tradeoffs: row.tradeoffs,
      practicalImplications: row.practicalImplications, openQuestions: row.openQuestions,
      limitations: row.limitations, angleCount: row._count.angles,
      sources: row.sources.map((source) => ({ id: source.evidenceId, databaseId: source.id, title: source.title, publisher: source.publisher, domain: source.domain, type: source.type })),
    };
  },

  async persistGeneration(input) {
    return prisma.$transaction(async (tx) => {
      const rows = [];
      for (const angle of input.angles) {
        const row = await tx.contentAngle.create({
          data: {
            topicResearchId: input.research.id, generationId: input.generationId,
            title: angle.title, thesis: angle.thesis, authorConnectionType: angle.authorConnectionType,
            whyItFitsAuthor: angle.whyItFitsAuthor, fitScore: angle.fitScore,
            requiresHumanInput: angle.requiresHumanInput, humanInputPrompt: angle.humanInputPrompt,
            claimBoundaryNotes: angle.claimBoundaryNotes, authorProfileHash: input.authorProfileHash,
            model: input.model, generatedAt: input.generatedAt,
            supportingSources: { create: supportingSourceConnections(angle, input.research) },
          },
          include: angleInclude,
        });
        rows.push(persisted(row));
      }
      return rows;
    });
  },

  async list(researchId) {
    const rows = await prisma.contentAngle.findMany({
      where: { topicResearchId: researchId }, include: angleInclude,
      orderBy: [{ generatedAt: "desc" }, { fitScore: "desc" }, { createdAt: "asc" }],
    });
    return rows.map(persisted);
  },

  async select(angleId) {
    const angle = await prisma.contentAngle.findUnique({
      where: { id: angleId },
      select: { topicResearchId: true, topicResearch: { select: { topic: { select: { title: true } } } } },
    });
    if (!angle) return null;
    return prisma.$transaction(async (tx) => {
      const selected = await applyExclusiveAngleSelection(angle.topicResearchId, angleId, {
        async clearSelected(topicResearchId) {
          await tx.contentAngle.updateMany({ where: { topicResearchId, status: "SELECTED" }, data: { status: "GENERATED" } });
        },
        async markSelected(id) {
          return tx.contentAngle.update({ where: { id }, data: { status: "SELECTED" }, include: angleInclude });
        },
      });
      return { ...persisted(selected), researchTitle: angle.topicResearch.topic.title };
    });
  },
};
