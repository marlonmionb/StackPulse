const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 100;

export function getHackerNewsIngestionLimit(
  configuredValue = process.env.HN_INGESTION_LIMIT,
): number {
  if (configuredValue === undefined || configuredValue.trim() === "") {
    return DEFAULT_LIMIT;
  }

  const limit = Number(configuredValue);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new Error(
      `HN_INGESTION_LIMIT must be an integer between 1 and ${MAX_LIMIT}.`,
    );
  }

  return limit;
}
