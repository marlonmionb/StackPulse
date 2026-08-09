import { ANGLE_TEXT_LIMITS, AUTHOR_CONNECTION_TYPES } from "./constants";
import type { AngleResearch, AuthorConnectionType, ResearchEvidenceReference, ValidatedContentAngle } from "./types";

export class AngleGenerationOutputError extends Error {
  constructor(message: string, options?: ErrorOptions) { super(message, options); this.name = "AngleGenerationOutputError"; }
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new AngleGenerationOutputError(`${label} must be an object.`);
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new AngleGenerationOutputError(`${label} must be non-empty and at most ${max} characters.`);
  return value.trim();
}
function normalized(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }

function referenceArray(value: unknown, label: string): ResearchEvidenceReference[] {
  if (!Array.isArray(value)) throw new Error(`TopicResearch ${label} is invalid.`);
  return value.map((raw, index) => {
    const row = object(raw, `TopicResearch ${label}[${index}]`);
    const entryText = row.text;
    if (typeof entryText !== "string" || !entryText.trim() || !Array.isArray(row.sourceIds) || row.sourceIds.length === 0 || !row.sourceIds.every((id) => typeof id === "string")) {
      throw new Error(`TopicResearch ${label}[${index}] is invalid.`);
    }
    return { text: entryText.trim(), sourceIds: row.sourceIds as string[] };
  });
}

export function validateAngleResearch(research: AngleResearch): AngleResearch {
  if (!research.topic?.id || !research.topic.title.trim()) throw new Error(`TopicResearch ${research.id} has no valid parent Topic.`);
  if (!research.summary.trim() || !research.whyItMatters.trim()) throw new Error(`TopicResearch ${research.id} is incomplete.`);
  if (research.sources.length === 0) throw new Error(`TopicResearch ${research.id} has no evidence sources.`);
  const sourceIds = new Set(research.sources.map((source) => source.id));
  if (sourceIds.size !== research.sources.length) throw new Error(`TopicResearch ${research.id} has duplicate evidence IDs.`);
  const findings = referenceArray(research.keyFindings, "keyFindings");
  if (findings.length === 0) throw new Error(`TopicResearch ${research.id} has no key findings.`);
  for (const field of ["technicalDetails", "tradeoffs", "practicalImplications"] as const) {
    for (const reference of referenceArray(research[field], field)) {
      if (reference.sourceIds.some((id) => !sourceIds.has(id))) throw new Error(`TopicResearch ${research.id} contains a dangling evidence ID.`);
    }
  }
  for (const reference of findings) {
    if (reference.sourceIds.some((id) => !sourceIds.has(id))) throw new Error(`TopicResearch ${research.id} contains a dangling evidence ID.`);
  }
  for (const field of ["openQuestions", "limitations"] as const) {
    if (!Array.isArray(research[field]) || !(research[field] as unknown[]).every((item) => typeof item === "string")) throw new Error(`TopicResearch ${research.id} ${field} is invalid.`);
  }
  return research;
}

export function parseAndValidateAngleOutput(outputText: string, sourceIds: readonly string[], expectedCount: number): ValidatedContentAngle[] {
  let parsed: unknown;
  try { parsed = JSON.parse(outputText); } catch (error) { throw new AngleGenerationOutputError("OpenAI returned malformed angle JSON.", { cause: error }); }
  const root = object(parsed, "angle output");
  if (!Array.isArray(root.angles) || root.angles.length !== expectedCount) throw new AngleGenerationOutputError(`Expected exactly ${expectedCount} angles.`);
  const allowedSources = new Set(sourceIds);
  const titles = new Set<string>();
  const theses = new Set<string>();
  return root.angles.map((raw, index) => {
    const row = object(raw, `angles[${index}]`);
    const title = text(row.title, `angles[${index}].title`, ANGLE_TEXT_LIMITS.title);
    const thesis = text(row.thesis, `angles[${index}].thesis`, ANGLE_TEXT_LIMITS.thesis);
    const normalizedTitle = normalized(title); const normalizedThesis = normalized(thesis);
    if (titles.has(normalizedTitle)) throw new AngleGenerationOutputError("Duplicate angle titles are not allowed.");
    if (theses.has(normalizedThesis)) throw new AngleGenerationOutputError("Duplicate angle theses are not allowed.");
    titles.add(normalizedTitle); theses.add(normalizedThesis);
    if (!AUTHOR_CONNECTION_TYPES.includes(row.authorConnectionType as AuthorConnectionType)) throw new AngleGenerationOutputError(`Invalid author connection in angles[${index}].`);
    if (!Number.isInteger(row.fitScore) || Number(row.fitScore) < 0 || Number(row.fitScore) > 10) throw new AngleGenerationOutputError(`angles[${index}].fitScore must be an integer from 0 to 10.`);
    if (!Array.isArray(row.supportingSourceIds) || row.supportingSourceIds.length === 0) throw new AngleGenerationOutputError(`angles[${index}] requires supporting evidence.`);
    const supportingSourceIds = row.supportingSourceIds.map((id) => {
      if (typeof id !== "string" || !allowedSources.has(id)) throw new AngleGenerationOutputError(`angles[${index}] contains unknown research source ID ${String(id)}.`);
      return id;
    });
    if (new Set(supportingSourceIds).size !== supportingSourceIds.length) throw new AngleGenerationOutputError(`angles[${index}] contains duplicate research source IDs.`);
    if (typeof row.requiresHumanInput !== "boolean") throw new AngleGenerationOutputError(`angles[${index}].requiresHumanInput must be boolean.`);
    let humanInputPrompt: string | null;
    if (row.requiresHumanInput) humanInputPrompt = text(row.humanInputPrompt, `angles[${index}].humanInputPrompt`, ANGLE_TEXT_LIMITS.humanInputPrompt);
    else {
      if (row.humanInputPrompt !== null) throw new AngleGenerationOutputError(`angles[${index}].humanInputPrompt must be null when human input is not required.`);
      humanInputPrompt = null;
    }
    return {
      title, thesis, authorConnectionType: row.authorConnectionType as AuthorConnectionType,
      whyItFitsAuthor: text(row.whyItFitsAuthor, `angles[${index}].whyItFitsAuthor`, ANGLE_TEXT_LIMITS.whyItFitsAuthor),
      supportingSourceIds, fitScore: Number(row.fitScore), requiresHumanInput: row.requiresHumanInput,
      humanInputPrompt, claimBoundaryNotes: text(row.claimBoundaryNotes, `angles[${index}].claimBoundaryNotes`, ANGLE_TEXT_LIMITS.claimBoundaryNotes),
    };
  });
}
