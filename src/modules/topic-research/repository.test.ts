import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topicResearchSourceRows } from "./repository";
import type { ValidatedResearchReport } from "./types";

describe("Topic Research source persistence mapping", () => {
  it("creates one TopicResearchSource row per consolidated canonical URL", () => {
    const report: ValidatedResearchReport = {
      summary: "Summary", whyItMatters: "Why", keyFindings: [{ text: "Finding", sourceIds: ["s1"], confidence: "HIGH" }],
      technicalDetails: [], tradeoffs: [], practicalImplications: [], openQuestions: [], limitations: [],
      sources: [
        { id: "s1", title: "Official SDK", url: "https://example.com/sdk", canonicalUrl: "https://example.com/sdk", publisher: "Example", domain: "example.com", publishedAt: null, type: "PRIMARY" },
        { id: "s2", title: "Independent analysis", url: "https://analysis.example/article", canonicalUrl: "https://analysis.example/article", publisher: "Analysis", domain: "analysis.example", publishedAt: null, type: "SECONDARY" },
      ],
    };
    const rows = topicResearchSourceRows(report);
    assert.equal(rows.length, 2); assert.equal(rows[0].evidenceId, "s1");
    assert.equal(rows[0].canonicalUrl, "https://example.com/sdk");
    assert.equal(rows[0].type, "PRIMARY"); assert.equal(rows[1].type, "SECONDARY");
  });
});
