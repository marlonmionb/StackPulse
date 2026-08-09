import { executeAiRequest, type AiExecutionResult, type AiExecutionUsage, type ExecuteAiRequest } from "@/lib/ai";
import { deriveTopicSelectability } from "@/modules/topics/selection";
import { getTopicResearchConfig, type TopicResearchConfig } from "./config";
import { collectSeedEvidence, collectWebSearchEvidence, consolidateResearchEvidence, parseWebResearchNarrative } from "./evidence";
import { TOPIC_RESEARCH_EVIDENCE_FEATURE, TOPIC_RESEARCH_FEATURE, TOPIC_RESEARCH_SYNTHESIS_FEATURE } from "./constants";
import { buildTopicResearchEvidencePrompt, buildTopicResearchSynthesisPrompt } from "./prompt";
import { topicResearchRepository, type TopicResearchRepository } from "./repository";
import { topicResearchEvidenceOutputFormat, topicResearchOutputFormat } from "./structured-output";
import type { TopicResearchResult } from "./types";
import { parseAndValidateTopicResearchOutput } from "./validation";

type Dependencies = { repository?: TopicResearchRepository; executeAi?: (request: ExecuteAiRequest) => Promise<AiExecutionResult>; config?: TopicResearchConfig; now?: () => Date };

function combinedUsage(evidence: AiExecutionUsage, synthesis: AiExecutionUsage): AiExecutionUsage {
  const sum = (left: number | null, right: number | null) => left === null || right === null ? null : left + right;
  return {
    feature: TOPIC_RESEARCH_FEATURE, model: synthesis.model,
    inputTokens: evidence.inputTokens + synthesis.inputTokens,
    outputTokens: evidence.outputTokens + synthesis.outputTokens,
    reasoningTokens: evidence.reasoningTokens + synthesis.reasoningTokens,
    webSearchCalls: evidence.webSearchCalls + synthesis.webSearchCalls,
    totalTokens: evidence.totalTokens + synthesis.totalTokens,
    requestedAt: evidence.requestedAt, durationMs: evidence.durationMs + synthesis.durationMs,
    status: "SUCCESS",
    estimatedTokenCostUsd: sum(evidence.estimatedTokenCostUsd, synthesis.estimatedTokenCostUsd),
    estimatedToolCostUsd: sum(evidence.estimatedToolCostUsd, synthesis.estimatedToolCostUsd),
    estimatedCostUsd: sum(evidence.estimatedCostUsd, synthesis.estimatedCostUsd),
  };
}

export async function researchTopic(topicId: string, options: { force?: boolean } = {}, dependencies: Dependencies = {}): Promise<TopicResearchResult> {
  if (!topicId.trim()) throw new Error("--topic-id is required.");
  const repository = dependencies.repository ?? topicResearchRepository;
  const topic = await repository.findTopic(topicId.trim());
  if (!topic) throw new Error(`Topic not found: ${topicId.trim()}.`);
  const selectability = deriveTopicSelectability(topic.status, topic.sourceItems);
  if (!selectability.selectable) throw new Error(`Topic cannot be researched because ${selectability.reason.charAt(0).toLowerCase()}${selectability.reason.slice(1)}`);
  if (topic.researchCount > 0 && !options.force) return { skipped: true, topic, researchId: null, report: null, usage: null };

  const config = dependencies.config ?? getTopicResearchConfig();
  const executeAi = dependencies.executeAi ?? executeAiRequest;
  const seedEvidence = collectSeedEvidence(topic);
  await repository.markSelected(topic.id);
  const evidenceResponse = await executeAi({
    feature: TOPIC_RESEARCH_EVIDENCE_FEATURE, model: config.model,
    input: buildTopicResearchEvidencePrompt(topic, config.maxWebSearchCalls), maxOutputTokens: config.maxOutputTokens,
    structuredOutput: topicResearchEvidenceOutputFormat, reasoningEffort: "medium",
    webSearch: { maxCalls: config.maxWebSearchCalls, searchContextSize: "medium" },
  });
  const researchNarrative = parseWebResearchNarrative(evidenceResponse.outputText);
  const webEvidence = collectWebSearchEvidence(evidenceResponse.webSearchSources);
  const evidence = consolidateResearchEvidence(seedEvidence, webEvidence);
  if (evidence.length === 0) throw new Error("Topic Research did not collect any grounded evidence.");

  const synthesisResponse = await executeAi({
    feature: TOPIC_RESEARCH_SYNTHESIS_FEATURE, model: config.model,
    input: buildTopicResearchSynthesisPrompt(topic, evidence, researchNarrative), maxOutputTokens: config.maxOutputTokens,
    structuredOutput: topicResearchOutputFormat(evidence.map((source) => source.id)), reasoningEffort: "medium",
  });
  const report = parseAndValidateTopicResearchOutput(synthesisResponse.outputText, evidence);
  const usage = combinedUsage(evidenceResponse.usage, synthesisResponse.usage);
  const researchId = await repository.persist(topic.id, report, usage, (dependencies.now ?? (() => new Date()))());
  return { skipped: false, topic, researchId, report, usage };
}
