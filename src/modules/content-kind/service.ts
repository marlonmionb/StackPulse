import { executeAiRequest, type AiExecutionResult, type ExecuteAiRequest } from "@/lib/ai";
import { CONTENT_KIND_BATCH_SIZE, CONTENT_KIND_FEATURE, CONTENT_KIND_MAX_OUTPUT_TOKENS, CONTENT_KIND_MODEL, CONTENT_KINDS } from "./constants";
import { buildContentKindPrompt } from "./prompt";
import { contentKindRepository, type ContentKindRepository } from "./repository";
import { contentKindOutputFormat } from "./structured-output";
import type { ContentKindSummary } from "./types";
import { parseAndValidateContentKindOutput } from "./validation";

type AiExecutor = (request: ExecuteAiRequest) => Promise<AiExecutionResult>;
export type EvaluateContentKindOptions = { force?: boolean; limit?: number; batchSize?: number };
type Dependencies = { repository?: ContentKindRepository; executeAi?: AiExecutor; now?: () => Date };

export class ContentKindBatchError extends Error {
  constructor(public readonly batchNumber: number, public readonly completed: ContentKindSummary, options?: ErrorOptions) {
    super(`Content Kind batch ${batchNumber} failed after ${completed.evaluated} items.`, options);
    this.name = "ContentKindBatchError";
  }
}

function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) batches.push(items.slice(index, index + size));
  return batches;
}

function emptySummary(candidates: number): ContentKindSummary {
  return { candidates, evaluated: 0, counts: Object.fromEntries(CONTENT_KINDS.map((kind) => [kind, 0])) as ContentKindSummary["counts"], aiRequests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
}

export async function evaluateContentKind(options: EvaluateContentKindOptions = {}, dependencies: Dependencies = {}): Promise<ContentKindSummary> {
  const batchSize = options.batchSize ?? CONTENT_KIND_BATCH_SIZE;
  if (!Number.isInteger(batchSize) || batchSize <= 0 || batchSize > 50) throw new RangeError("Content Kind batch size must be an integer from 1 to 50.");
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) throw new RangeError("Content Kind limit must be a positive integer.");
  const repository = dependencies.repository ?? contentKindRepository;
  const executeAi = dependencies.executeAi ?? executeAiRequest;
  const now = dependencies.now ?? (() => new Date());
  const candidates = await repository.findCandidates({ force: options.force ?? false, limit: options.limit });
  const summary = emptySummary(candidates.length);
  for (const [batchIndex, batch] of chunks(candidates, batchSize).entries()) {
    try {
      const response = await executeAi({ feature: CONTENT_KIND_FEATURE, model: CONTENT_KIND_MODEL, input: buildContentKindPrompt(batch), maxOutputTokens: CONTENT_KIND_MAX_OUTPUT_TOKENS, structuredOutput: contentKindOutputFormat(batch.map((item) => item.id)) });
      const classifications = parseAndValidateContentKindOutput(response.outputText, batch.map((item) => item.id));
      await repository.persistBatch(classifications, now());
      summary.evaluated += classifications.length;
      for (const item of classifications) summary.counts[item.contentKind] += 1;
      summary.aiRequests += 1;
      summary.inputTokens += response.usage.inputTokens;
      summary.outputTokens += response.usage.outputTokens;
      summary.estimatedCostUsd += response.usage.estimatedCostUsd ?? 0;
    } catch (error) {
      throw new ContentKindBatchError(batchIndex + 1, { ...summary, counts: { ...summary.counts } }, { cause: error });
    }
  }
  return summary;
}
