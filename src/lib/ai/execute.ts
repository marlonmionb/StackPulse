import { assertMonthlyBudgetAvailable } from "./budget";
import { createOpenAiProvider, type AiProvider } from "./client";
import { getAiConfig, type AiConfig } from "./config";
import { AiConfigurationError, AiProviderRequestError } from "./errors";
import { calculateEstimatedCostUsd, getModelPricing } from "./pricing";
import type { AiExecutionResult, AiExecutionUsage } from "./types";
import {
  aiUsageRepository,
  type AiUsageStore,
} from "./usage.repository";

export type ExecuteAiRequest = {
  feature: string;
  input: string;
  maxOutputTokens: number;
  model?: string;
};

type ExecuteAiDependencies = {
  config?: AiConfig;
  provider?: AiProvider;
  usageStore?: AiUsageStore;
  now?: () => Date;
};

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
    });
  } catch (error) {
    const durationMs = Math.max(0, now().getTime() - requestedAt.getTime());
    const providerError = new AiProviderRequestError(request.feature, {
      cause: error,
    });

    try {
      await usageStore.create({
        feature: request.feature,
        model,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: null,
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
  const usage: AiExecutionUsage = {
    feature: request.feature,
    model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    totalTokens: response.totalTokens,
    requestedAt,
    durationMs,
    status: "SUCCESS",
    estimatedCostUsd,
  };

  await usageStore.create({
    feature: usage.feature,
    model: usage.model,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    estimatedCostUsd: usage.estimatedCostUsd,
    durationMs: usage.durationMs,
    status: usage.status,
    createdAt: usage.requestedAt,
  });

  return { outputText: response.outputText, usage };
}
