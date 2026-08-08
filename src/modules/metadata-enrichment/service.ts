import { getMetadataEnrichmentConfig } from "./config";
import { isMetadataEnrichmentEligible } from "./eligibility";
import { fetchMetadataHtml, type MetadataFetchResult } from "./metadata-fetcher";
import { extractMetadataDescription } from "./metadata-parser";
import {
  metadataEnrichmentRepository,
  type MetadataEnrichmentRepository,
} from "./repository";
import type {
  MetadataEnrichmentCandidate,
  MetadataEnrichmentResult,
  MetadataEnrichmentSummary,
} from "./types";

export type EnrichSourceMetadataOptions = {
  force?: boolean;
  limit?: number;
  concurrency?: number;
};

type MetadataEnrichmentDependencies = {
  repository?: MetadataEnrichmentRepository;
  fetchHtml?: (url: string) => Promise<MetadataFetchResult>;
  now?: () => Date;
};

type CountedResult = "enriched" | "noMetadata" | "failed" | "skipped";

async function processCandidate(
  candidate: MetadataEnrichmentCandidate,
  repository: MetadataEnrichmentRepository,
  fetchHtml: (url: string) => Promise<MetadataFetchResult>,
  now: () => Date,
): Promise<CountedResult> {
  if (!isMetadataEnrichmentEligible(candidate)) return "skipped";

  let result: MetadataEnrichmentResult;
  try {
    const fetched = await fetchHtml(candidate.url);
    if (fetched.kind === "NO_METADATA") {
      result = { status: "NO_METADATA" };
    } else {
      const summary = extractMetadataDescription(fetched.html);
      result = summary
        ? { status: "ENRICHED", summary }
        : { status: "NO_METADATA" };
    }
  } catch {
    result = { status: "FAILED" };
  }

  const persisted = await repository.persistResult(candidate.id, result, now());
  if (!persisted) return "skipped";
  if (result.status === "ENRICHED") return "enriched";
  if (result.status === "NO_METADATA") return "noMetadata";
  return "failed";
}

export async function enrichSourceMetadata(
  options: EnrichSourceMetadataOptions = {},
  dependencies: MetadataEnrichmentDependencies = {},
): Promise<MetadataEnrichmentSummary> {
  if (options.limit !== undefined && (!Number.isInteger(options.limit) || options.limit <= 0)) {
    throw new RangeError("Metadata enrichment limit must be a positive integer.");
  }

  const config = getMetadataEnrichmentConfig();
  const concurrency = options.concurrency ?? config.concurrency;
  if (!Number.isInteger(concurrency) || concurrency <= 0 || concurrency > 10) {
    throw new RangeError("Metadata enrichment concurrency must be an integer from 1 to 10.");
  }

  const repository = dependencies.repository ?? metadataEnrichmentRepository;
  const fetchHtml = dependencies.fetchHtml ?? ((url) => fetchMetadataHtml(url, config));
  const now = dependencies.now ?? (() => new Date());
  const candidates = await repository.findCandidates({
    force: options.force ?? false,
    limit: options.limit,
  });
  const summary: MetadataEnrichmentSummary = {
    candidates: candidates.length,
    enriched: 0,
    noMetadata: 0,
    failed: 0,
    skipped: 0,
  };
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < candidates.length) {
      const candidate = candidates[nextIndex];
      nextIndex += 1;
      const counted = await processCandidate(candidate, repository, fetchHtml, now);
      summary[counted] += 1;
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, candidates.length) }, () => worker()),
  );
  return summary;
}
