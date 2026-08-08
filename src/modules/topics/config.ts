import { DEFAULT_TOPIC_DISCOVERY_INTERESTS } from "./constants";

export type TopicDiscoveryConfig = {
  lookbackDays: number;
  maxItems: number;
  maxTopics: number;
  interests: string[];
};

type TopicDiscoveryEnvironment = Record<string, string | undefined>;

function integerSetting(
  env: TopicDiscoveryEnvironment,
  name: string,
  defaultValue: number,
  maximum: number,
): number {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : defaultValue;
  if (!Number.isInteger(value) || value <= 0 || value > maximum) {
    throw new Error(`${name} must be an integer from 1 to ${maximum}.`);
  }
  return value;
}

export function getTopicDiscoveryConfig(
  env: TopicDiscoveryEnvironment = process.env,
): TopicDiscoveryConfig {
  const configuredInterests = env.TOPIC_DISCOVERY_INTERESTS?.split(",")
    .map((interest) => interest.trim())
    .filter(Boolean);
  const interests = configuredInterests?.length
    ? [...new Set(configuredInterests)]
    : [...DEFAULT_TOPIC_DISCOVERY_INTERESTS];

  if (interests.length > 30 || interests.some((interest) => interest.length > 80)) {
    throw new Error("TOPIC_DISCOVERY_INTERESTS must contain at most 30 entries of at most 80 characters.");
  }

  return {
    lookbackDays: integerSetting(env, "TOPIC_DISCOVERY_LOOKBACK_DAYS", 7, 90),
    maxItems: integerSetting(env, "TOPIC_DISCOVERY_MAX_ITEMS", 50, 100),
    maxTopics: integerSetting(env, "TOPIC_DISCOVERY_MAX_TOPICS", 10, 20),
    interests,
  };
}
