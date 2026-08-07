export type AiExecutionStatus = "SUCCESS" | "FAILURE";

export type AiExecutionUsage = {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestedAt: Date;
  durationMs: number;
  status: AiExecutionStatus;
  estimatedCostUsd: number | null;
};

export type AiExecutionResult = {
  outputText: string;
  usage: AiExecutionUsage;
};
