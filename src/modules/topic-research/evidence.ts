import { canonicalizeUrl } from "@/modules/ingestion/deduplication";
import type { AiWebSearchSource } from "@/lib/ai";
import { TOPIC_RESEARCH_MAX_SEED_SOURCES, TOPIC_RESEARCH_MAX_SOURCES, TOPIC_RESEARCH_MAX_SUMMARY_LENGTH } from "./constants";
import type { ConsolidatedResearchEvidence, RawResearchEvidence, TopicForResearch } from "./types";

export class TopicResearchEvidenceError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "TopicResearchEvidenceError"; }
}

function parseHttpUrl(value: string): { canonicalUrl: string; domain: string } {
  let parsed: URL;
  try { parsed = new URL(value); } catch (error) { throw new TopicResearchEvidenceError(`Invalid evidence URL: ${value}`, { cause: error }); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new TopicResearchEvidenceError(`Unsupported evidence URL protocol: ${parsed.protocol}`);
  return { canonicalUrl: canonicalizeUrl(value), domain: parsed.hostname.toLowerCase() };
}

export function collectSeedEvidence(topic: TopicForResearch): RawResearchEvidence[] {
  return topic.sourceItems.slice(0, TOPIC_RESEARCH_MAX_SEED_SOURCES).flatMap((item) => {
    const url = item.canonicalUrl ?? item.url;
    try {
      const { domain } = parseHttpUrl(url);
      return [{
        title: item.title, url, publisher: domain, publishedAt: item.publishedAt,
        evidence: item.summary?.slice(0, TOPIC_RESEARCH_MAX_SUMMARY_LENGTH) ?? null,
        origin: "TOPIC_SEED" as const,
      }];
    } catch { return []; }
  });
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TopicResearchEvidenceError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new TopicResearchEvidenceError(`${label} must be non-empty and at most ${max} characters.`);
  return value.trim();
}

export function parseWebResearchNarrative(outputText: string): string {
  let parsed: unknown;
  try { parsed = JSON.parse(outputText); } catch (error) { throw new TopicResearchEvidenceError("OpenAI returned malformed evidence JSON.", { cause: error }); }
  const root = object(parsed, "evidence output");
  return requiredText(root.researchNarrative, "researchNarrative", 8_000);
}

export function collectWebSearchEvidence(sources: readonly AiWebSearchSource[]): RawResearchEvidence[] {
  return sources.flatMap((source) => {
    try {
      const { domain } = parseHttpUrl(source.url);
      const title = source.title?.trim().slice(0, 300) || domain;
      return [{
        title, url: source.url, publisher: domain, publishedAt: null,
        evidence: null, origin: "WEB_SEARCH" as const,
      }];
    } catch { return []; }
  });
}

function betterText(current: string | null, candidate: string | null): string | null {
  if (!current) return candidate;
  if (!candidate) return current;
  return candidate.length > current.length ? candidate : current;
}

export function consolidateResearchEvidence(
  seedEvidence: readonly RawResearchEvidence[],
  webEvidence: readonly RawResearchEvidence[],
  limit = TOPIC_RESEARCH_MAX_SOURCES,
): ConsolidatedResearchEvidence[] {
  const byCanonicalUrl = new Map<string, Omit<ConsolidatedResearchEvidence, "id">>();
  for (const candidate of [...seedEvidence, ...webEvidence]) {
    const { canonicalUrl, domain } = parseHttpUrl(candidate.url);
    const current = byCanonicalUrl.get(canonicalUrl);
    if (!current) {
      byCanonicalUrl.set(canonicalUrl, { ...candidate, canonicalUrl, domain });
      continue;
    }
    byCanonicalUrl.set(canonicalUrl, {
      ...current,
      title: betterText(current.title, candidate.title)!,
      publisher: betterText(current.publisher, candidate.publisher),
      publishedAt: current.publishedAt ?? candidate.publishedAt,
      evidence: betterText(current.evidence, candidate.evidence),
      origin: current.origin === candidate.origin ? current.origin : "TOPIC_SEED_AND_WEB_SEARCH",
    });
  }
  return [...byCanonicalUrl.values()].slice(0, limit).map((source, index) => ({ ...source, id: `s${index + 1}` }));
}
