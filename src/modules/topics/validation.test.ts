import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAndValidateTopicDiscoveryOutput } from "./validation";

function topic(overrides: Record<string, unknown> = {}) {
  return {
    title: "React Compiler adoption",
    description: "What stable compiler adoption changes for React teams.",
    overallScore: 9.1,
    profileRelevanceScore: 10,
    technicalDepthScore: 9,
    freshnessScore: 8.5,
    contentPotentialScore: 9,
    rankingReason: "Strong fit with practical implications for frontend engineers.",
    sourceItemIds: ["react-1", "react-2"],
    ...overrides,
  };
}

function output(topics: unknown[]): string {
  return JSON.stringify({ topics });
}

describe("parseAndValidateTopicDiscoveryOutput", () => {
  it("accepts 0-10 scores and safely removes duplicate source references", () => {
    const [parsed] = parseAndValidateTopicDiscoveryOutput(
      output([topic({ sourceItemIds: ["react-1", "react-1", "react-2"] })]),
      ["react-1", "react-2"],
      10,
    );
    assert.deepEqual(parsed.sourceItemIds, ["react-1", "react-2"]);
    assert.equal(parsed.overallScore, 9.1);
  });

  it("rejects out-of-range scores and unknown SourceItems", () => {
    assert.throws(
      () => parseAndValidateTopicDiscoveryOutput(output([topic({ freshnessScore: 11 })]), ["react-1", "react-2"], 10),
      /outside 0-10/,
    );
    assert.throws(
      () => parseAndValidateTopicDiscoveryOutput(output([topic({ sourceItemIds: ["unknown"] })]), ["react-1"], 10),
      /unknown SourceItem id/,
    );
  });

  it("requires supporting items and enforces the maximum topic count", () => {
    assert.throws(
      () => parseAndValidateTopicDiscoveryOutput(output([topic({ sourceItemIds: [] })]), ["react-1"], 10),
      /must contain supporting/,
    );
    assert.throws(
      () => parseAndValidateTopicDiscoveryOutput(output([topic(), topic({ title: "Another", sourceItemIds: ["other"] })]), ["react-1", "react-2", "other"], 1),
      /more than 1 topics/,
    );
  });

  it("collapses duplicate topic support sets to the highest-scoring result", () => {
    const parsed = parseAndValidateTopicDiscoveryOutput(
      output([
        topic({ title: "Lower", overallScore: 7 }),
        topic({ title: "Higher", overallScore: 9 }),
      ]),
      ["react-1", "react-2"],
      10,
    );
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].title, "Higher");
  });
});
