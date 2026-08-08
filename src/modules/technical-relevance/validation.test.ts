import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAndValidateTechnicalRelevanceOutput,
  TechnicalRelevanceOutputError,
} from "./validation";

function output(classifications: unknown[]): string {
  return JSON.stringify({ classifications });
}

function classification(sourceItemId: string, relevanceScore = 6) {
  return {
    sourceItemId,
    relevant: true,
    relevanceScore,
    category: "SOFTWARE_ENGINEERING",
    reason: "Meaningfully about software engineering.",
  };
}

describe("technical relevance output validation", () => {
  it("accepts both score boundaries", () => {
    const result = parseAndValidateTechnicalRelevanceOutput(
      output([classification("zero", 0), classification("ten", 10)]),
      ["zero", "ten"],
    );
    assert.deepEqual(result.map((item) => item.relevanceScore), [0, 10]);
  });

  it("rejects scores outside 0-10", () => {
    assert.throws(
      () => parseAndValidateTechnicalRelevanceOutput(output([classification("bad", 11)]), ["bad"]),
      TechnicalRelevanceOutputError,
    );
  });

  it("rejects unknown returned ids", () => {
    assert.throws(
      () => parseAndValidateTechnicalRelevanceOutput(output([classification("unknown")]), ["expected"]),
      /unknown SourceItem id/,
    );
  });

  it("rejects duplicate returned ids", () => {
    assert.throws(
      () => parseAndValidateTechnicalRelevanceOutput(output([classification("one"), classification("one")]), ["one", "two"]),
      /duplicate SourceItem id/,
    );
  });

  it("detects missing classifications", () => {
    assert.throws(
      () => parseAndValidateTechnicalRelevanceOutput(output([classification("one")]), ["one", "two"]),
      /omitted classifications.*two/,
    );
  });

  it("rejects relevant=false with a technical category", () => {
    assert.throws(
      () =>
        parseAndValidateTechnicalRelevanceOutput(
          output([
            {
              ...classification("inconsistent", 2),
              relevant: false,
              category: "AI",
            },
          ]),
          ["inconsistent"],
        ),
      /not relevant but has technical category AI/,
    );
  });

  it("rejects relevant=true with NON_SOFTWARE", () => {
    assert.throws(
      () =>
        parseAndValidateTechnicalRelevanceOutput(
          output([
            {
              ...classification("inconsistent", 8),
              category: "NON_SOFTWARE",
            },
          ]),
          ["inconsistent"],
        ),
      /relevant but has category NON_SOFTWARE/,
    );
  });
});
