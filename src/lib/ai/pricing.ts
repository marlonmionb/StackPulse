import { UnsupportedModelPricingError } from "./errors";

export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

// Manually maintained. Update these values when OpenAI pricing changes.
export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "gpt-5.6-terra": {
    inputUsdPerMillionTokens: 2.5,
    outputUsdPerMillionTokens: 15,
  },
  "gpt-5.4-nano": {
    inputUsdPerMillionTokens: 0.2,
    outputUsdPerMillionTokens: 1.25,
  },
  "gpt-4o-mini": {
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
  },
};

// Manually maintained. The current non-preview Web Search price is $10/1,000 calls.
export const WEB_SEARCH_USD_PER_CALL = 0.01;

export function getModelPricing(model: string): ModelPricing {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new UnsupportedModelPricingError(model);
  }

  return pricing;
}

export function calculateWebSearchCostUsd(webSearchCalls: number): number {
  if (!Number.isInteger(webSearchCalls) || webSearchCalls < 0) {
    throw new RangeError("webSearchCalls must be a non-negative integer.");
  }
  return webSearchCalls * WEB_SEARCH_USD_PER_CALL;
}

export function calculateEstimatedCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const pricing = getModelPricing(model);

  return (
    (inputTokens * pricing.inputUsdPerMillionTokens +
      outputTokens * pricing.outputUsdPerMillionTokens) /
    1_000_000
  );
}
