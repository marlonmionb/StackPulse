import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isTechnicalRelevanceCandidate } from "./candidate-selection";

describe("isTechnicalRelevanceCandidate", () => {
  const base = {
    title: "PostgreSQL query planner changes",
    contentType: "ARTICLE" as const,
    technicalRelevanceEvaluatedAt: null,
  };

  it("excludes videos and items without enough title information", () => {
    assert.equal(isTechnicalRelevanceCandidate({ ...base, contentType: "VIDEO" }), false);
    assert.equal(isTechnicalRelevanceCandidate({ ...base, title: "   " }), false);
    assert.equal(isTechnicalRelevanceCandidate(base), true);
  });

  it("skips evaluated items unless force is deliberate", () => {
    const evaluated = {
      ...base,
      technicalRelevanceEvaluatedAt: new Date("2026-08-07T12:00:00Z"),
    };
    assert.equal(isTechnicalRelevanceCandidate(evaluated), false);
    assert.equal(isTechnicalRelevanceCandidate(evaluated, true), true);
  });
});
