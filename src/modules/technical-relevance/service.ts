import { executeAiRequest, type AiExecutionResult, type ExecuteAiRequest } from "@/lib/ai";
import {
  TECHNICAL_RELEVANCE_BATCH_SIZE,
  TECHNICAL_RELEVANCE_FEATURE,
  TECHNICAL_RELEVANCE_MAX_OUTPUT_TOKENS,
  TECHNICAL_RELEVANCE_MODEL,
} from "./constants";
import { meetsTechnicalRelevanceThreshold } from "./eligibility";
import { buildTechnicalRelevancePrompt } from "./prompt";
import {
  technicalRelevanceRepository,
  type TechnicalRelevanceRepository,
} from "./repository";
import { technicalRelevanceOutputFormat } from "./structured-output";
import type { TechnicalRelevanceSummary } from "./types";
import { parseAndValidateTechnicalRelevanceOutput } from "./validation";

type AiExecutor = (request: ExecuteAiRequest) => Promise<AiExecutionResult>;

export type EvaluateTechnicalRelevanceOptions = {
  force?: boolean;
  limit?: number;
  batchSize?: number;
};

type TechnicalRelevanceDependencies = {
  repository?: TechnicalRelevanceRepository;
  executeAi?: AiExecutor;
  now?: () => Date;
};

export class TechnicalRelevanceBatchError extends Error {
  constructor(
    public readonly batchNumber: number,
    public readonly completed: TechnicalRelevanceSummary,
    options?: ErrorOptions,
  ) {
    super(`Technical relevance batch ${batchNumber} failed after ${completed.evaluated} items.`, options);
    this.name = "TechnicalRelevanceBatchError";
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    result.push(items.slice(index, index + size));
  }
  return result;
}

function emptySummary(candidates: number): TechnicalRelevanceSummary {
  return {
    candidates,
    evaluated: 0,
    relevant: 0,
    rejected: 0,
    aiRequests: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostUsd: 0,
    rejectedTitles: [],
  };
}

export async function evaluateTechnicalRelevance(
  options: EvaluateTechnicalRelevanceOptions = {},
  dependencies: TechnicalRelevanceDependencies = {},
): Promise<TechnicalRelevanceSummary> {
  const batchSize = options.batchSize ?? TECHNICAL_RELEVANCE_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize <= 0 || batchSize > 50) {
    throw new RangeError("Technical relevance batch size must be an integer from 1 to 50.");
  }
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new RangeError("Technical relevance limit must be a positive integer.");
  }

  const repository = dependencies.repository ?? technicalRelevanceRepository;
  const executeAi = dependencies.executeAi ?? executeAiRequest;
  const now = dependencies.now ?? (() => new Date());
  const candidates = await repository.findCandidates({
    force: options.force ?? false,
    limit: options.limit,
  });
  const summary = emptySummary(candidates.length);

  for (const [batchIndex, batch] of chunks(candidates, batchSize).entries()) {
    try {
      const response = await executeAi({
        feature: TECHNICAL_RELEVANCE_FEATURE,
        model: TECHNICAL_RELEVANCE_MODEL,
        input: buildTechnicalRelevancePrompt(batch),
        maxOutputTokens: TECHNICAL_RELEVANCE_MAX_OUTPUT_TOKENS,
        structuredOutput: technicalRelevanceOutputFormat(batch.length),
      });
      const classifications = parseAndValidateTechnicalRelevanceOutput(
        response.outputText,
        batch.map((item) => item.id),
      );
      const persisted = classifications.map((classification) => ({
        ...classification,
        technicalRelevant: meetsTechnicalRelevanceThreshold(classification),
      }));

      await repository.persistBatch(persisted, now());

      const titlesById = new Map(batch.map((item) => [item.id, item.title]));
      const rejected = persisted.filter((item) => !item.technicalRelevant);
      summary.evaluated += persisted.length;
      summary.relevant += persisted.length - rejected.length;
      summary.rejected += rejected.length;
      summary.aiRequests += 1;
      summary.inputTokens += response.usage.inputTokens;
      summary.outputTokens += response.usage.outputTokens;
      summary.estimatedCostUsd += response.usage.estimatedCostUsd ?? 0;
      summary.rejectedTitles.push(
        ...rejected.slice(0, Math.max(0, 5 - summary.rejectedTitles.length)).map(
          (item) => titlesById.get(item.sourceItemId) ?? item.sourceItemId,
        ),
      );
    } catch (error) {
      throw new TechnicalRelevanceBatchError(batchIndex + 1, { ...summary }, { cause: error });
    }
  }

  return summary;
}
