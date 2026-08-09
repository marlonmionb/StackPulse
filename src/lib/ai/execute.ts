import { assertMonthlyBudgetAvailable } from "./budget";
import { createOpenAiProvider, type AiProvider } from "./client";
import { getAiConfig, type AiConfig } from "./config";
import { AiConfigurationError, AiProviderRequestError } from "./errors";
import { calculateEstimatedCostUsd, calculateWebSearchCostUsd, getModelPricing } from "./pricing";
import type { AiExecutionResult, AiExecutionUsage } from "./types";
import type { AiStructuredOutput } from "./client";
import {
  aiUsageRepository,
  type AiUsageStore,
} from "./usage.repository";

export type ExecuteAiRequest = {
  feature: string;
  input: string;
  maxOutputTokens: number;
  model?: string;
  structuredOutput?: AiStructuredOutput;
  reasoningEffort?: "low" | "medium" | "high";
  webSearch?: { maxCalls: number; searchContextSize?: "low" | "medium" | "high" };
};

type ExecuteAiDependencies = {
  config?: AiConfig;
  provider?: AiProvider;
  usageStore?: AiUsageStore;
  now?: () => Date;
};

function usageFromProviderError(error: unknown): {
  inputTokens: number; outputTokens: number; reasoningTokens: number; webSearchCalls: number;
} | null {
  if (typeof error !== "object" || error === null || !("usage" in error)) return null;
  const usage = (error as { usage?: Record<string, unknown> }).usage;
  if (!usage) return null;
  const values = [usage.inputTokens, usage.outputTokens, usage.reasoningTokens, usage.webSearchCalls];
  if (!values.every((value) => Number.isInteger(value) && Number(value) >= 0)) return null;
  return {
    inputTokens: Number(usage.inputTokens), outputTokens: Number(usage.outputTokens),
    reasoningTokens: Number(usage.reasoningTokens), webSearchCalls: Number(usage.webSearchCalls),
  };
}

export async function executeAiRequest(
  request: ExecuteAiRequest,
  dependencies: ExecuteAiDependencies = {},
): Promise<AiExecutionResult> {
  if (!request.feature.trim()) {
    throw new AiConfigurationError("An AI feature name is required.");
  }

  if (!Number.isInteger(request.maxOutputTokens) || request.maxOutputTokens <= 0) {
    throw new AiConfigurationError("maxOutputTokens must be a positive integer.");
  }
  if (request.webSearch && (!Number.isInteger(request.webSearch.maxCalls) || request.webSearch.maxCalls <= 0 || request.webSearch.maxCalls > 10)) {
    throw new AiConfigurationError("webSearch.maxCalls must be an integer from 1 to 10.");
  }

  const config = dependencies.config ?? getAiConfig();
  const model = request.model ?? config.defaultModel;
  const usageStore = dependencies.usageStore ?? aiUsageRepository;
  const now = dependencies.now ?? (() => new Date());
  const requestedAt = now();

  getModelPricing(model);
  await assertMonthlyBudgetAvailable(
    usageStore,
    config.monthlyBudgetUsd,
    requestedAt,
  );

  const provider =
    dependencies.provider ?? createOpenAiProvider(config.apiKey);

  let response;

  try {
    response = await provider.createResponse({
      model,
      input: request.input,
      maxOutputTokens: request.maxOutputTokens,
      structuredOutput: request.structuredOutput,
      reasoningEffort: request.reasoningEffort,
      webSearch: request.webSearch,
    });
  } catch (error) {
    const durationMs = Math.max(0, now().getTime() - requestedAt.getTime());
    const providerError = new AiProviderRequestError(request.feature, {
      cause: error,
    });

    const incurred = usageFromProviderError(error);
    const estimatedTokenCostUsd = incurred ? calculateEstimatedCostUsd(model, incurred.inputTokens, incurred.outputTokens) : null;
    const estimatedToolCostUsd = incurred ? calculateWebSearchCostUsd(incurred.webSearchCalls) : null;
    try {
      await usageStore.create({
        feature: request.feature,
        model,
        inputTokens: incurred?.inputTokens ?? 0,
        outputTokens: incurred?.outputTokens ?? 0,
        reasoningTokens: incurred?.reasoningTokens ?? 0,
        webSearchCalls: incurred?.webSearchCalls ?? 0,
        estimatedTokenCostUsd,
        estimatedToolCostUsd,
        estimatedCostUsd: estimatedTokenCostUsd === null || estimatedToolCostUsd === null ? null : estimatedTokenCostUsd + estimatedToolCostUsd,
        durationMs,
        status: "FAILURE",
        createdAt: requestedAt,
      });
    } catch (persistenceError) {
      throw new AiProviderRequestError(request.feature, {
        cause: new AggregateError([error, persistenceError]),
      });
    }

    throw providerError;
  }

  const durationMs = Math.max(0, now().getTime() - requestedAt.getTime());
  const estimatedCostUsd = calculateEstimatedCostUsd(
    model,
    response.inputTokens,
    response.outputTokens,
  );
  const estimatedToolCostUsd = calculateWebSearchCostUsd(response.webSearchCalls);
  const usage: AiExecutionUsage = {
    feature: request.feature,
    model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    reasoningTokens: response.reasoningTokens,
    webSearchCalls: response.webSearchCalls,
    totalTokens: response.totalTokens,
    requestedAt,
    durationMs,
    status: "SUCCESS",
    estimatedTokenCostUsd: estimatedCostUsd,
    estimatedToolCostUsd,
    estimatedCostUsd: estimatedCostUsd + estimatedToolCostUsd,
  };

  await usageStore.create({
    feature: usage.feature,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.reasoningTokens,
    webSearchCalls: usage.webSearchCalls,
    estimatedTokenCostUsd: usage.estimatedTokenCostUsd,
    estimatedToolCostUsd: usage.estimatedToolCostUsd,
    estimatedCostUsd: usage.estimatedCostUsd,
    durationMs: usage.durationMs,
    status: usage.status,
    createdAt: usage.requestedAt,
  });

  return { outputText: response.outputText, groundedUrls: response.groundedUrls, usage };
}
