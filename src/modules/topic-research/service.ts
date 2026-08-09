import { executeAiRequest, type AiExecutionResult, type ExecuteAiRequest } from "@/lib/ai";
import { deriveTopicSelectability } from "@/modules/topics/selection";
import { getTopicResearchConfig, type TopicResearchConfig } from "./config";
import { TOPIC_RESEARCH_FEATURE } from "./constants";
import { buildTopicResearchPrompt, seedUrls } from "./prompt";
import { topicResearchRepository, type TopicResearchRepository } from "./repository";
import { topicResearchOutputFormat } from "./structured-output";
import type { TopicResearchResult } from "./types";
import { parseAndValidateTopicResearchOutput } from "./validation";

type Dependencies = { repository?: TopicResearchRepository; executeAi?: (request: ExecuteAiRequest) => Promise<AiExecutionResult>; config?: TopicResearchConfig; now?: () => Date };

export async function researchTopic(topicId: string, options: { force?: boolean } = {}, dependencies: Dependencies = {}): Promise<TopicResearchResult> {
  if (!topicId.trim()) throw new Error("--topic-id is required.");
  const repository = dependencies.repository ?? topicResearchRepository;
  const topic = await repository.findTopic(topicId.trim());
  if (!topic) throw new Error(`Topic not found: ${topicId.trim()}.`);
  const selectability = deriveTopicSelectability(topic.status, topic.sourceItems);
  if (!selectability.selectable) throw new Error(`Topic cannot be researched because ${selectability.reason.charAt(0).toLowerCase()}${selectability.reason.slice(1)}`);
  if (topic.researchCount > 0 && !options.force) return { skipped: true, topic, researchId: null, report: null, usage: null };

  const config = dependencies.config ?? getTopicResearchConfig();
  await repository.markSelected(topic.id);
  const response = await (dependencies.executeAi ?? executeAiRequest)({
    feature: TOPIC_RESEARCH_FEATURE, model: config.model,
    input: buildTopicResearchPrompt(topic, config.maxWebSearchCalls), maxOutputTokens: config.maxOutputTokens,
    structuredOutput: topicResearchOutputFormat, reasoningEffort: "medium",
    webSearch: { maxCalls: config.maxWebSearchCalls, searchContextSize: "medium" },
  });
  const report = parseAndValidateTopicResearchOutput(response.outputText, [...seedUrls(topic), ...response.groundedUrls]);
  const researchId = await repository.persist(topic.id, report, response.usage, (dependencies.now ?? (() => new Date()))());
  return { skipped: false, topic, researchId, report, usage: response.usage };
}
