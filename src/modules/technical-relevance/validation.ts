import {
  TECHNICAL_CATEGORIES,
  type TechnicalCategory,
} from "./constants";
import type { TechnicalRelevanceClassification } from "./types";

export class TechnicalRelevanceOutputError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "TechnicalRelevanceOutputError";
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseClassification(value: unknown): TechnicalRelevanceClassification {
  if (!isObject(value)) {
    throw new TechnicalRelevanceOutputError("A classification is not an object.");
  }

  const { sourceItemId, relevant, relevanceScore, category, reason } = value;
  if (typeof sourceItemId !== "string" || !sourceItemId) {
    throw new TechnicalRelevanceOutputError("A classification has an invalid sourceItemId.");
  }
  if (typeof relevant !== "boolean") {
    throw new TechnicalRelevanceOutputError(`Classification ${sourceItemId} has an invalid relevant value.`);
  }
  if (!Number.isInteger(relevanceScore) || (relevanceScore as number) < 0 || (relevanceScore as number) > 10) {
    throw new TechnicalRelevanceOutputError(`Classification ${sourceItemId} has a score outside 0-10.`);
  }
  if (typeof category !== "string" || !TECHNICAL_CATEGORIES.includes(category as TechnicalCategory)) {
    throw new TechnicalRelevanceOutputError(`Classification ${sourceItemId} has an invalid category.`);
  }
  if (!relevant && category !== "NON_SOFTWARE") {
    throw new TechnicalRelevanceOutputError(
      `Classification ${sourceItemId} is not relevant but has technical category ${category}.`,
    );
  }
  if (relevant && category === "NON_SOFTWARE") {
    throw new TechnicalRelevanceOutputError(
      `Classification ${sourceItemId} is relevant but has category NON_SOFTWARE.`,
    );
  }
  if (typeof reason !== "string" || !reason.trim() || reason.length > 180) {
    throw new TechnicalRelevanceOutputError(`Classification ${sourceItemId} has an invalid reason.`);
  }

  return { sourceItemId, relevant, relevanceScore: relevanceScore as number, category: category as TechnicalCategory, reason: reason.trim() };
}

export function parseAndValidateTechnicalRelevanceOutput(
  outputText: string,
  inputIds: readonly string[],
): TechnicalRelevanceClassification[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch (error) {
    throw new TechnicalRelevanceOutputError("OpenAI returned invalid JSON.", { cause: error });
  }

  if (!isObject(parsed) || !Array.isArray(parsed.classifications)) {
    throw new TechnicalRelevanceOutputError("OpenAI output is missing classifications.");
  }

  const inputIdSet = new Set(inputIds);
  const seen = new Set<string>();
  const classifications = parsed.classifications.map(parseClassification);

  for (const classification of classifications) {
    if (!inputIdSet.has(classification.sourceItemId)) {
      throw new TechnicalRelevanceOutputError(`OpenAI returned unknown SourceItem id ${classification.sourceItemId}.`);
    }
    if (seen.has(classification.sourceItemId)) {
      throw new TechnicalRelevanceOutputError(`OpenAI returned duplicate SourceItem id ${classification.sourceItemId}.`);
    }
    seen.add(classification.sourceItemId);
  }

  const missing = inputIds.filter((id) => !seen.has(id));
  if (missing.length > 0) {
    throw new TechnicalRelevanceOutputError(`OpenAI omitted classifications for: ${missing.join(", ")}.`);
  }

  return classifications;
}
