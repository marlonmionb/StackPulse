import type { ConsolidatedResearchEvidence, EvidenceReference, KeyFinding, SourceAssessment, ValidatedResearchReport } from "./types";

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
function evidenceIds(evidence: readonly ConsolidatedResearchEvidence[]): Set<string> {
  if (evidence.length === 0) throw new TopicResearchOutputError("The synthesis evidence set is empty.");
  const ids = new Set<string>();
  const canonicalUrls = new Set<string>();
  for (const source of evidence) {
    if (!/^s[1-9]\d*$/.test(source.id)) throw new TopicResearchOutputError(`Invalid internal source id: ${source.id}.`);
    if (ids.has(source.id)) throw new TopicResearchOutputError(`Duplicate internal source id: ${source.id}.`);
    if (canonicalUrls.has(source.canonicalUrl)) throw new TopicResearchOutputError(`Duplicate canonical evidence URL: ${source.canonicalUrl}.`);
    ids.add(source.id); canonicalUrls.add(source.canonicalUrl);
  }
  return ids;
}

function references(value: unknown, label: string, textField: string, ids: Set<string>, maxItems: number): EvidenceReference[] {
  if (!Array.isArray(value) || value.length > maxItems) throw new TopicResearchOutputError(`${label} must be a bounded array.`);
  return value.map((raw, index) => {
    const row = object(raw, `${label}[${index}]`);
    if (!Array.isArray(row.sourceIds) || row.sourceIds.length === 0) throw new TopicResearchOutputError(`${label}[${index}] requires evidence.`);
    const sourceIds = [...new Set(row.sourceIds.map((id) => {
      if (typeof id !== "string" || !ids.has(id)) throw new TopicResearchOutputError(`${label}[${index}] contains dangling source id ${String(id)}.`);
      return id;
    }))];
    return { text: text(row[textField], `${label}[${index}].${textField}`, 700), sourceIds };
  });
}

function sourceAssessments(value: unknown, ids: Set<string>): Map<string, SourceAssessment["type"]> {
  if (!Array.isArray(value)) throw new TopicResearchOutputError("sourceAssessments must be an array.");
  const assessments = new Map<string, SourceAssessment["type"]>();
  for (const [index, raw] of value.entries()) {
    const row = object(raw, `sourceAssessments[${index}]`);
    const sourceId = row.sourceId;
    if (typeof sourceId !== "string" || !ids.has(sourceId)) throw new TopicResearchOutputError(`sourceAssessments[${index}] contains unknown source id ${String(sourceId)}.`);
    if (assessments.has(sourceId)) throw new TopicResearchOutputError(`Duplicate source assessment for ${sourceId}.`);
    if (row.type !== "PRIMARY" && row.type !== "SECONDARY") throw new TopicResearchOutputError(`Invalid source type in sourceAssessments[${index}].`);
    assessments.set(sourceId, row.type);
  }
  const missing = [...ids].filter((id) => !assessments.has(id));
  if (missing.length > 0) throw new TopicResearchOutputError(`Missing source assessment for ${missing.join(", ")}.`);
  return assessments;
}

export function parseAndValidateTopicResearchOutput(outputText: string, evidence: readonly ConsolidatedResearchEvidence[]): ValidatedResearchReport {
  let parsed: unknown;
  try { parsed = JSON.parse(outputText); } catch (error) { throw new TopicResearchOutputError("OpenAI returned malformed research JSON.", { cause: error }); }
  const root = object(parsed, "research output");
  const ids = evidenceIds(evidence);
  const assessments = sourceAssessments(root.sourceAssessments, ids);
  const findingRefs = references(root.keyFindings, "keyFindings", "finding", ids, 10);
  if (findingRefs.length === 0) throw new TopicResearchOutputError("At least one key finding is required.");
  const rawFindings = root.keyFindings as Record<string, unknown>[];
  const keyFindings: KeyFinding[] = findingRefs.map((finding, index) => {
    const confidence = rawFindings[index].confidence;
    if (confidence !== "HIGH" && confidence !== "MEDIUM" && confidence !== "LOW") throw new TopicResearchOutputError(`Invalid confidence in keyFindings[${index}].`);
    return { ...finding, confidence };
  });
  return {
    summary: text(root.summary, "summary", 2_000), whyItMatters: text(root.whyItMatters, "whyItMatters", 1_500),
    keyFindings, technicalDetails: references(root.technicalDetails, "technicalDetails", "detail", ids, 10),
    tradeoffs: references(root.tradeoffs, "tradeoffs", "point", ids, 8),
    practicalImplications: references(root.practicalImplications, "practicalImplications", "implication", ids, 8),
    openQuestions: textArray(root.openQuestions, "openQuestions", 8), limitations: textArray(root.limitations, "limitations", 8),
    sources: evidence.map((source) => ({
      id: source.id, title: source.title, url: source.url, canonicalUrl: source.canonicalUrl,
      publisher: source.publisher, domain: source.domain, publishedAt: source.publishedAt, type: assessments.get(source.id)!,
    })),
  };
}
