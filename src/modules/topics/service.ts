import { executeAiRequest, type AiExecutionResult, type ExecuteAiRequest } from "@/lib/ai";
import { TOPIC_DISCOVERY_FEATURE, TOPIC_DISCOVERY_MAX_OUTPUT_TOKENS, TOPIC_DISCOVERY_MODEL } from "./constants";
import { getTopicDiscoveryConfig, type TopicDiscoveryConfig } from "./config";
import { buildTopicDiscoveryPrompt } from "./prompt";
import { topicDiscoveryRepository, type TopicDiscoveryRepository } from "./repository";
import { topicDiscoveryOutputFormat } from "./structured-output";
import type { TopicDiscoverySummary } from "./types";
import { parseAndValidateTopicDiscoveryOutput } from "./validation";

type AiExecutor = (request: ExecuteAiRequest) => Promise<AiExecutionResult>;
export type DiscoverTopicsOptions = { limit?: number };
type TopicDiscoveryDependencies = {
  repository?: TopicDiscoveryRepository;
  executeAi?: AiExecutor;
  config?: TopicDiscoveryConfig;
  now?: () => Date;
};

export async function discoverTopics(
  options: DiscoverTopicsOptions = {},
  dependencies: TopicDiscoveryDependencies = {},
): Promise<TopicDiscoverySummary> {
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new RangeError("Topic discovery limit must be a positive integer.");
  }
  const config = dependencies.config ?? getTopicDiscoveryConfig();
  const repository = dependencies.repository ?? topicDiscoveryRepository;
  const executeAi = dependencies.executeAi ?? executeAiRequest;
  const now = dependencies.now ?? (() => new Date());
  const discoveredAt = now();
  const publishedAfter = new Date(discoveredAt.getTime() - config.lookbackDays * 86_400_000);
  const candidateLimit = Math.min(options.limit ?? config.maxItems, config.maxItems);
  const candidates = await repository.findCandidates({ publishedAfter, limit: candidateLimit });

  if (candidates.length === 0) {
    return { candidates: 0, topics: [], aiRequests: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 };
  }
  const response = await executeAi({
    feature: TOPIC_DISCOVERY_FEATURE,
    model: TOPIC_DISCOVERY_MODEL,
    input: buildTopicDiscoveryPrompt(candidates, config.interests, config.maxTopics),
    maxOutputTokens: TOPIC_DISCOVERY_MAX_OUTPUT_TOKENS,
    structuredOutput: topicDiscoveryOutputFormat(config.maxTopics),
  });
  const topics = parseAndValidateTopicDiscoveryOutput(
    response.outputText,
    candidates.map((candidate) => candidate.id),
    config.maxTopics,
  );
  const persisted = await repository.persistTopics(topics, discoveredAt);
  return {
    candidates: candidates.length,
    topics: persisted,
    aiRequests: 1,
    inputTokens: response.usage.inputTokens,
    outputTokens: response.usage.outputTokens,
    estimatedCostUsd: response.usage.estimatedCostUsd ?? 0,
  };
}
