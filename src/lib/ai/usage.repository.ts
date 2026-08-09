import type { AiUsageStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import type { MonthlyUsageReader } from "./budget";

export type AiUsageRecord = {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
  estimatedTokenCostUsd: number | null;
  estimatedToolCostUsd: number | null;
  estimatedCostUsd: number | null;
  durationMs: number;
  status: AiUsageStatus;
  createdAt: Date;
};

export type AiUsageWriter = {
  create(record: AiUsageRecord): Promise<void>;
};

export type AiUsageStore = MonthlyUsageReader & AiUsageWriter;

export const aiUsageRepository: AiUsageStore = {
  async create(record) {
    await prisma.aiUsage.create({ data: record });
  },

  async getSpendUsdBetween(start, end) {
    const result = await prisma.aiUsage.aggregate({
      _sum: { estimatedCostUsd: true },
      where: {
        createdAt: { gte: start, lt: end },
      },
    });

    return result._sum.estimatedCostUsd ?? 0;
  },
};
