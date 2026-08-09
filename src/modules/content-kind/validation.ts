import { CONTENT_KIND_CONFIDENCES, CONTENT_KINDS, type ContentKind, type ContentKindConfidence } from "./constants";
import type { ContentKindClassification } from "./types";

export class ContentKindOutputError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ContentKindOutputError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClassification(value: unknown): ContentKindClassification {
  if (!isObject(value)) throw new ContentKindOutputError("A classification is not an object.");
  const { sourceItemId, contentKind, confidence, reason } = value;
  if (typeof sourceItemId !== "string" || !sourceItemId) throw new ContentKindOutputError("A classification has an invalid sourceItemId.");
  if (typeof contentKind !== "string" || !CONTENT_KINDS.includes(contentKind as ContentKind)) throw new ContentKindOutputError(`Classification ${sourceItemId} has an invalid contentKind.`);
  if (typeof confidence !== "string" || !CONTENT_KIND_CONFIDENCES.includes(confidence as ContentKindConfidence)) throw new ContentKindOutputError(`Classification ${sourceItemId} has invalid confidence.`);
  if (typeof reason !== "string" || !reason.trim() || reason.length > 180) throw new ContentKindOutputError(`Classification ${sourceItemId} has an invalid reason.`);
  return { sourceItemId, contentKind: contentKind as ContentKind, confidence: confidence as ContentKindConfidence, reason: reason.trim() };
}

export function parseAndValidateContentKindOutput(outputText: string, inputIds: readonly string[]): ContentKindClassification[] {
  let parsed: unknown;
  try { parsed = JSON.parse(outputText); } catch (error) { throw new ContentKindOutputError("OpenAI returned invalid JSON.", { cause: error }); }
  if (!isObject(parsed) || (!Array.isArray(parsed.classifications) && !isObject(parsed.classifications))) throw new ContentKindOutputError("OpenAI output is missing classifications.");
  const inputIdSet = new Set(inputIds);
  const seen = new Set<string>();
  const classifications = Array.isArray(parsed.classifications)
    ? parsed.classifications.map(parseClassification)
    : Object.entries(parsed.classifications).map(([sourceItemId, value]) => {
        if (!isObject(value)) throw new ContentKindOutputError(`Classification ${sourceItemId} is not an object.`);
        return parseClassification({ sourceItemId, ...value });
      });
  for (const classification of classifications) {
    if (!inputIdSet.has(classification.sourceItemId)) throw new ContentKindOutputError(`OpenAI returned unknown SourceItem id ${classification.sourceItemId}.`);
    if (seen.has(classification.sourceItemId)) throw new ContentKindOutputError(`OpenAI returned duplicate SourceItem id ${classification.sourceItemId}.`);
    seen.add(classification.sourceItemId);
  }
  const missing = inputIds.filter((id) => !seen.has(id));
  if (missing.length) throw new ContentKindOutputError(`OpenAI omitted classifications for: ${missing.join(", ")}.`);
  return classifications;
}
