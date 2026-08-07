export class AiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigurationError";
  }
}

export class UnsupportedModelPricingError extends Error {
  constructor(model: string) {
    super(`No local pricing is configured for OpenAI model "${model}".`);
    this.name = "UnsupportedModelPricingError";
  }
}

export class AiBudgetExhaustedError extends Error {
  constructor(
    public readonly budgetUsd: number,
    public readonly spentUsd: number,
  ) {
    super(
      `Internal monthly AI budget is exhausted ($${spentUsd.toFixed(6)} spent of $${budgetUsd.toFixed(2)}).`,
    );
    this.name = "AiBudgetExhaustedError";
  }
}

export class AiProviderRequestError extends Error {
  constructor(feature: string, options?: ErrorOptions) {
    super(`OpenAI request failed for feature "${feature}".`, options);
    this.name = "AiProviderRequestError";
  }
}
