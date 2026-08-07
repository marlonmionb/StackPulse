import { AiConfigurationError } from "./errors";

export type AiConfig = {
  apiKey: string;
  defaultModel: string;
  monthlyBudgetUsd: number;
};

function requireValue(
  env: NodeJS.ProcessEnv,
  name: keyof NodeJS.ProcessEnv,
): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new AiConfigurationError(`${name} is required for AI requests.`);
  }

  return value;
}

export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const budgetValue = requireValue(env, "AI_MONTHLY_BUDGET_USD");
  const monthlyBudgetUsd = Number(budgetValue);

  if (!Number.isFinite(monthlyBudgetUsd) || monthlyBudgetUsd <= 0) {
    throw new AiConfigurationError(
      "AI_MONTHLY_BUDGET_USD must be a positive number.",
    );
  }

  return {
    apiKey: requireValue(env, "OPENAI_API_KEY"),
    defaultModel: requireValue(env, "OPENAI_DEFAULT_MODEL"),
    monthlyBudgetUsd,
  };
}
