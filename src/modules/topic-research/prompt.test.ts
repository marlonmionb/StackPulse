import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTopicResearchPrompt } from "./prompt";
import type { TopicForResearch } from "./types";

describe("Topic Research prompt", () => {
  it("keeps research separate from writing and treats product marketing as attributed claims", () => {
    const topic: TopicForResearch = {
      id: "topic", title: "Tool performance", description: null, rankingReason: null,
      score: 8, profileRelevanceScore: 8, technicalDepthScore: 8, freshnessScore: 8, contentPotentialScore: 8,
      status: "DISCOVERED", researchCount: 0,
      sourceItems: [{ id: "source", title: "Technical announcement", url: "https://example.com/announcement", canonicalUrl: null,
        source: "rss", summary: null, publishedAt: null, contentKind: "OFFICIAL_TECHNICAL", technicalCategory: "DEVELOPER_TOOLING",
        contentType: "ARTICLE", technicalRelevant: true, technicalRelevanceEvaluatedAt: new Date(), contentKindEvaluatedAt: new Date(),
        metadataEnrichmentStatus: "PENDING", metadataEnrichmentAttemptedAt: null }],
    };
    const prompt = buildTopicResearchPrompt(topic, 4);
    assert.match(prompt, /Product pages are valid only as primary evidence of what a vendor says/);
    assert.match(prompt, /Do not write a hook, hashtags, angle, LinkedIn post, or draft/);
    assert.match(prompt, /approximately 2-4 bounded calls/);
    assert.match(prompt, /Topic Research \(this task\)/);
  });
});
