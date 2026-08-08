import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { meetsTechnicalRelevanceThreshold } from "./eligibility";

describe("meetsTechnicalRelevanceThreshold", () => {
  it("uses the application threshold of six", () => {
    assert.equal(meetsTechnicalRelevanceThreshold({ relevant: true, relevanceScore: 5, category: "BACKEND" }), false);
    assert.equal(meetsTechnicalRelevanceThreshold({ relevant: true, relevanceScore: 6, category: "BACKEND" }), true);
  });

  it("never makes NON_SOFTWARE eligible", () => {
    assert.equal(meetsTechnicalRelevanceThreshold({ relevant: true, relevanceScore: 10, category: "NON_SOFTWARE" }), false);
  });
});
