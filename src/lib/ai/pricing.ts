import { UnsupportedModelPricingError } from "./errors";

export type ModelPricing = {
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number;
};

// Manually maintained. Update these values when OpenAI pricing changes.
export const MODEL_PRICING: Readonly<Record<string, ModelPricing>> = {
  "gpt-4o-mini": {
    inputUsdPerMillionTokens: 0.15,
    outputUsdPerMillionTokens: 0.6,
  },
};

export function getModelPricing(model: string): ModelPricing {
  const pricing = MODEL_PRICING[model];

  if (!pricing) {
    throw new UnsupportedModelPricingError(model);
  }

  return pricing;
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
