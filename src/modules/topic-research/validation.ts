import { canonicalizeUrl } from "@/modules/ingestion/deduplication";
import { TOPIC_RESEARCH_MAX_SOURCES } from "./constants";
import type { EvidenceReference, KeyFinding, ResearchSource, ValidatedResearchReport } from "./types";

export class TopicResearchOutputError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "TopicResearchOutputError"; }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TopicResearchOutputError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new TopicResearchOutputError(`${label} must be non-empty and at most ${max} characters.`);
  return value.trim();
}
function textArray(value: unknown, label: string, maxItems: number): string[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new TopicResearchOutputError(`${label} must be a bounded array.`);
  return value.map((entry, index) => text(entry, `${label}[${index}]`, 500));
}
function httpUrl(value: unknown): { url: string; canonicalUrl: string; domain: string } {
  const url = text(value, "source URL", 2_000);
  let parsed: URL;
  try { parsed = new URL(url); } catch (error) { throw new TopicResearchOutputError(`Invalid source URL: ${url}`, { cause: error }); }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new TopicResearchOutputError(`Unsupported source URL protocol: ${parsed.protocol}`);
  return { url, canonicalUrl: canonicalizeUrl(url), domain: parsed.hostname.toLowerCase() };
}

function parseSources(value: unknown, groundedUrls: readonly string[]): { sources: ResearchSource[]; idMap: Map<string, string> } {
  if (!Array.isArray(value) || value.length === 0 || value.length > TOPIC_RESEARCH_MAX_SOURCES) throw new TopicResearchOutputError("sources must contain 1-10 entries.");
  const allowed = new Set(groundedUrls.map((url) => { try { return canonicalizeUrl(url); } catch { return ""; } }).filter(Boolean));
  const ids = new Set<string>();
  const canonicalToId = new Map<string, string>();
  const idMap = new Map<string, string>();
  const sources: ResearchSource[] = [];
  for (const [index, raw] of value.entries()) {
    const source = object(raw, `sources[${index}]`);
    const id = text(source.id, `sources[${index}].id`, 40);
    if (ids.has(id)) throw new TopicResearchOutputError(`Duplicate source id: ${id}.`);
    ids.add(id);
    const parsedUrl = httpUrl(source.url);
    if (!allowed.has(parsedUrl.canonicalUrl)) throw new TopicResearchOutputError(`Source URL was not grounded by seed context or Web Search: ${parsedUrl.url}`);
    const existingId = canonicalToId.get(parsedUrl.canonicalUrl);
    if (existingId) { idMap.set(id, existingId); continue; }
    const type = source.type;
    if (type !== "PRIMARY" && type !== "SECONDARY") throw new TopicResearchOutputError(`Invalid source type for ${id}.`);
    const publishedAt = source.publishedAt === null ? null : new Date(text(source.publishedAt, `${id}.publishedAt`, 50));
    if (publishedAt && Number.isNaN(publishedAt.getTime())) throw new TopicResearchOutputError(`Invalid publication date for ${id}.`);
    const publisher = source.publisher === null ? null : text(source.publisher, `${id}.publisher`, 200);
    canonicalToId.set(parsedUrl.canonicalUrl, id); idMap.set(id, id);
    sources.push({ id, title: text(source.title, `${id}.title`, 300), ...parsedUrl, publisher, publishedAt, type });
  }
  return { sources, idMap };
}

function references(value: unknown, label: string, textField: string, idMap: Map<string, string>, maxItems: number): EvidenceReference[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new TopicResearchOutputError(`${label} must be a bounded array.`);
  return value.map((raw, index) => {
    const row = object(raw, `${label}[${index}]`);
    if (!Array.isArray(row.sourceIds) || row.sourceIds.length === 0) throw new TopicResearchOutputError(`${label}[${index}] requires evidence.`);
    const sourceIds = [...new Set(row.sourceIds.map((id) => {
      if (typeof id !== "string" || !idMap.has(id)) throw new TopicResearchOutputError(`${label}[${index}] contains dangling source id ${String(id)}.`);
      return idMap.get(id)!;
    }))];
    return { text: text(row[textField], `${label}[${index}].${textField}`, 700), sourceIds };
  });
}

export function parseAndValidateTopicResearchOutput(outputText: string, groundedUrls: readonly string[]): ValidatedResearchReport {
  let parsed: unknown;
  try { parsed = JSON.parse(outputText); } catch (error) { throw new TopicResearchOutputError("OpenAI returned malformed research JSON.", { cause: error }); }
  const root = object(parsed, "research output");
  const { sources, idMap } = parseSources(root.sources, groundedUrls);
  const findingRefs = references(root.keyFindings, "keyFindings", "finding", idMap, 10);
  if (findingRefs.length === 0) throw new TopicResearchOutputError("At least one key finding is required.");
  const rawFindings = root.keyFindings as Record<string, unknown>[];
  const keyFindings: KeyFinding[] = findingRefs.map((finding, index) => {
    const confidence = rawFindings[index].confidence;
    if (confidence !== "HIGH" && confidence !== "MEDIUM" && confidence !== "LOW") throw new TopicResearchOutputError(`Invalid confidence in keyFindings[${index}].`);
    return { ...finding, confidence };
  });
  return {
    summary: text(root.summary, "summary", 2_000), whyItMatters: text(root.whyItMatters, "whyItMatters", 1_500),
    keyFindings, technicalDetails: references(root.technicalDetails, "technicalDetails", "detail", idMap, 10),
    tradeoffs: references(root.tradeoffs, "tradeoffs", "point", idMap, 8),
    practicalImplications: references(root.practicalImplications, "practicalImplications", "implication", idMap, 8),
    openQuestions: textArray(root.openQuestions, "openQuestions", 8), limitations: textArray(root.limitations, "limitations", 8), sources,
  };
}
