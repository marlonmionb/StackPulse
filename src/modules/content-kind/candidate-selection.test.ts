import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isContentKindCandidate } from "./candidate-selection";

const base = {
  title: "How we built a PostgreSQL query planner",
  contentType: "ARTICLE" as const,
  technicalRelevant: true,
  technicalRelevanceEvaluatedAt: new Date("2026-08-08T10:00:00Z"),
  contentKindEvaluatedAt: null,
  metadataEnrichmentStatus: "PENDING" as const,
  metadataEnrichmentAttemptedAt: null,
};

describe("ContentKind candidate selection", () => {
  it("accepts an eligible technical article and excludes videos", () => {
    assert.equal(isContentKindCandidate(base), true);
    assert.equal(isContentKindCandidate({ ...base, contentType: "VIDEO" }), false);
  });

  it("does not spend an AI call on technically rejected or unevaluated items", () => {
    assert.equal(isContentKindCandidate({ ...base, technicalRelevant: false }), false);
    assert.equal(isContentKindCandidate({ ...base, technicalRelevant: null, technicalRelevanceEvaluatedAt: null }), false);
  });

  it("skips evaluated records, allows force, and retries after newer successful enrichment", () => {
    const evaluatedAt = new Date("2026-08-08T11:00:00Z");
    const evaluated = { ...base, contentKindEvaluatedAt: evaluatedAt };
    assert.equal(isContentKindCandidate(evaluated), false);
    assert.equal(isContentKindCandidate(evaluated, true), true);
    assert.equal(isContentKindCandidate({ ...evaluated, metadataEnrichmentStatus: "ENRICHED", metadataEnrichmentAttemptedAt: new Date("2026-08-08T12:00:00Z") }), true);
    assert.equal(isContentKindCandidate({ ...evaluated, metadataEnrichmentStatus: "FAILED", metadataEnrichmentAttemptedAt: new Date("2026-08-08T12:00:00Z") }), false);
  });
});
