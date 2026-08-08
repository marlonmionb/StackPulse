import type { DiscoveredTopic } from "./types";

export class TopicDiscoveryOutputError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TopicDiscoveryOutputError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function boundedText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > maxLength) {
    throw new TopicDiscoveryOutputError(`A topic has an invalid ${field}.`);
  }
  return value.trim();
}

function score(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 10) {
    throw new TopicDiscoveryOutputError(`A topic has ${field} outside 0-10.`);
  }
  return value;
}

function parseTopic(value: unknown, inputIds: Set<string>): DiscoveredTopic {
  if (!isObject(value)) throw new TopicDiscoveryOutputError("A topic is not an object.");
  if (!Array.isArray(value.sourceItemIds) || value.sourceItemIds.length === 0) {
    throw new TopicDiscoveryOutputError("A topic must contain supporting SourceItems.");
  }
  const sourceItemIds: string[] = [];
  const seen = new Set<string>();
  for (const id of value.sourceItemIds) {
    if (typeof id !== "string" || !inputIds.has(id)) {
      throw new TopicDiscoveryOutputError(`A topic references unknown SourceItem id ${String(id)}.`);
    }
    if (!seen.has(id)) {
      seen.add(id);
      sourceItemIds.push(id);
    }
  }

  return {
    title: boundedText(value.title, "title", 140),
    description: boundedText(value.description, "description", 400),
    overallScore: score(value.overallScore, "overallScore"),
    profileRelevanceScore: score(value.profileRelevanceScore, "profileRelevanceScore"),
    technicalDepthScore: score(value.technicalDepthScore, "technicalDepthScore"),
    freshnessScore: score(value.freshnessScore, "freshnessScore"),
    contentPotentialScore: score(value.contentPotentialScore, "contentPotentialScore"),
    rankingReason: boundedText(value.rankingReason, "rankingReason", 240),
    sourceItemIds,
  };
}

export function parseAndValidateTopicDiscoveryOutput(
  outputText: string,
  inputIds: readonly string[],
  maxTopics: number,
): DiscoveredTopic[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new TopicDiscoveryOutputError("OpenAI returned invalid JSON.", { cause: error });
  }
  if (!isObject(parsed) || !Array.isArray(parsed.topics)) {
    throw new TopicDiscoveryOutputError("OpenAI output is missing topics.");
  }
  if (parsed.topics.length > maxTopics) {
    throw new TopicDiscoveryOutputError(`OpenAI returned more than ${maxTopics} topics.`);
  }

  const topics = parsed.topics.map((topic) => parseTopic(topic, new Set(inputIds)));
  const topicsBySupport = new Map<string, DiscoveredTopic>();
  for (const topic of topics) {
    const signature = topic.sourceItemIds.slice().sort().join("\u001f");
    const existing = topicsBySupport.get(signature);
    if (!existing || topic.overallScore > existing.overallScore) {
      topicsBySupport.set(signature, topic);
    }
  }
  return [...topicsBySupport.values()].sort(
    (left, right) => right.overallScore - left.overallScore,
  );
}
