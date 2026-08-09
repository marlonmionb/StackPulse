export type AiExecutionStatus = "SUCCESS" | "FAILURE";

export type AiExecutionUsage = {
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
  totalTokens: number;
  requestedAt: Date;
  durationMs: number;
  status: AiExecutionStatus;
  estimatedTokenCostUsd: number | null;
  estimatedToolCostUsd: number | null;
  estimatedCostUsd: number | null;
};

export type AiExecutionResult = {
  outputText: string;
  groundedUrls: string[];
  usage: AiExecutionUsage;
};
