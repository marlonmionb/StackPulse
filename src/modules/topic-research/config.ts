import {
  DEFAULT_TOPIC_RESEARCH_MAX_OUTPUT_TOKENS,
  DEFAULT_TOPIC_RESEARCH_MAX_WEB_SEARCH_CALLS,
  DEFAULT_TOPIC_RESEARCH_MODEL,
} from "./constants";

export type TopicResearchConfig = { model: string; maxOutputTokens: number; maxWebSearchCalls: number };

type ResearchEnvironment = Record<string, string | undefined>;

function positiveInteger(env: ResearchEnvironment, name: string, fallback: number, maximum: number): number {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value <= 0 || value > maximum) throw new Error(`${name} must be an integer from 1 to ${maximum}.`);
  return value;
}

export function getTopicResearchConfig(env: ResearchEnvironment = process.env): TopicResearchConfig {
  const model = env.OPENAI_TOPIC_RESEARCH_MODEL?.trim() || DEFAULT_TOPIC_RESEARCH_MODEL;
  return {
    model,
    maxOutputTokens: positiveInteger(env, "TOPIC_RESEARCH_MAX_OUTPUT_TOKENS", DEFAULT_TOPIC_RESEARCH_MAX_OUTPUT_TOKENS, 8_000),
    maxWebSearchCalls: positiveInteger(env, "TOPIC_RESEARCH_MAX_WEB_SEARCH_CALLS", DEFAULT_TOPIC_RESEARCH_MAX_WEB_SEARCH_CALLS, 4),
  };
}
