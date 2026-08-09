import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { topicResearchSourceRows } from "./repository";
import type { ValidatedResearchReport } from "./types";

describe("Topic Research source persistence mapping", () => {
  it("creates one TopicResearchSource row per consolidated canonical URL", () => {
    const report: ValidatedResearchReport = {
      summary: "Summary", whyItMatters: "Why", keyFindings: [{ text: "Finding", sourceIds: ["s1"], confidence: "HIGH" }],
      technicalDetails: [], tradeoffs: [], practicalImplications: [], openQuestions: [], limitations: [],
      sources: [{ id: "s1", title: "Interlock", url: "https://github.com/jajego/interlock", canonicalUrl: "https://github.com/jajego/interlock", publisher: "GitHub", domain: "github.com", publishedAt: null, type: "PRIMARY" }],
    };
    const rows = topicResearchSourceRows(report);
    assert.equal(rows.length, 1); assert.equal(rows[0].evidenceId, "s1");
    assert.equal(rows[0].canonicalUrl, "https://github.com/jajego/interlock");
  });
});
