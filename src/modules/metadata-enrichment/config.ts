export const DEFAULT_METADATA_ENRICHMENT_TIMEOUT_MS = 5_000;
export const DEFAULT_METADATA_ENRICHMENT_MAX_BYTES = 262_144;
export const DEFAULT_METADATA_ENRICHMENT_CONCURRENCY = 3;
export const METADATA_ENRICHMENT_MAX_DESCRIPTION_LENGTH = 1_000;

export type MetadataEnrichmentConfig = {
  timeoutMs: number;
  maxBytes: number;
  concurrency: number;
};

function readInteger(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;

  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

export function getMetadataEnrichmentConfig(): MetadataEnrichmentConfig {
  return {
    timeoutMs: readInteger(
      "METADATA_ENRICHMENT_TIMEOUT_MS",
      DEFAULT_METADATA_ENRICHMENT_TIMEOUT_MS,
      100,
      30_000,
    ),
    maxBytes: readInteger(
      "METADATA_ENRICHMENT_MAX_BYTES",
      DEFAULT_METADATA_ENRICHMENT_MAX_BYTES,
      1_024,
      1_048_576,
    ),
    concurrency: readInteger(
      "METADATA_ENRICHMENT_CONCURRENCY",
      DEFAULT_METADATA_ENRICHMENT_CONCURRENCY,
      1,
      10,
    ),
  };
}
