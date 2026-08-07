const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_RESULTS_PER_TOPIC = 10;
const MAX_LOOKBACK_DAYS = 365;
const MAX_RESULTS_PER_TOPIC = 100;

function parseInteger(
  name: string,
  configuredValue: string | undefined,
  defaultValue: number,
  maximum: number,
): number {
  if (configuredValue === undefined || configuredValue.trim() === "") {
    return defaultValue;
  }

  const value = Number(configuredValue);

  if (!Number.isInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}.`);
  }

  return value;
}

export function getHackerNewsSearchTopics(
  configuredValue = process.env.HN_SEARCH_TOPICS,
): string[] {
  const topics = (configuredValue ?? "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

  if (topics.length === 0) {
    throw new Error(
      "HN_SEARCH_TOPICS must contain at least one comma-separated search topic.",
    );
  }

  const uniqueTopics = new Map<string, string>();

  for (const topic of topics) {
    const key = topic.toLocaleLowerCase("en-US");
    if (!uniqueTopics.has(key)) uniqueTopics.set(key, topic);
  }

  return [...uniqueTopics.values()];
}

export function getHackerNewsSearchLookbackDays(
  configuredValue = process.env.HN_SEARCH_LOOKBACK_DAYS,
): number {
  return parseInteger(
    "HN_SEARCH_LOOKBACK_DAYS",
    configuredValue,
    DEFAULT_LOOKBACK_DAYS,
    MAX_LOOKBACK_DAYS,
  );
}

export function getHackerNewsSearchResultsPerTopic(
  configuredValue = process.env.HN_SEARCH_RESULTS_PER_TOPIC,
): number {
  return parseInteger(
    "HN_SEARCH_RESULTS_PER_TOPIC",
    configuredValue,
    DEFAULT_RESULTS_PER_TOPIC,
    MAX_RESULTS_PER_TOPIC,
  );
}
