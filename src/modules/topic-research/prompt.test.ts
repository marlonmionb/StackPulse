import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTopicResearchEvidencePrompt, buildTopicResearchSynthesisPrompt } from "./prompt";
import { topicResearchEvidenceOutputFormat, topicResearchOutputFormat } from "./structured-output";
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
    const collection = buildTopicResearchEvidencePrompt(topic, 4);
    assert.match(collection, /approximately 2-4 bounded calls/);
    assert.match(collection, /Do not return, reproduce, normalize, or propose source URLs/);
    assert.match(collection, /authoritative web source list exclusively from provider-returned Web Search metadata/);
    assert.doesNotMatch(JSON.stringify(topicResearchEvidenceOutputFormat.schema), /"url"/);
    const synthesis = buildTopicResearchSynthesisPrompt(topic, [{
      id: "s1", title: "Technical announcement", url: "https://example.com/announcement", canonicalUrl: "https://example.com/announcement",
      publisher: "Example", domain: "example.com", publishedAt: null, type: "PRIMARY", evidence: "Evidence", origin: "WEB_SEARCH",
    }]);
    assert.match(synthesis, /Product pages are valid only as primary evidence of what a vendor says/);
    assert.match(synthesis, /Do not write a hook, hashtags, angle, LinkedIn post, or draft/);
    assert.match(synthesis, /never use a URL as a source ID/);
    assert.match(synthesis, /"id":"s1"/);
    assert.match(synthesis, /"origin":"WEB_SEARCH"/);
    assert.match(synthesis, /any URL text here does not create an available source/);
    assert.doesNotMatch(JSON.stringify(topicResearchOutputFormat(["s1"]).schema), /"url"/);
    assert.match(synthesis, /Topic Research \(this task\)/);
  });

  it("requires semantically appropriate evidence attribution", () => {
    const topic: TopicForResearch = {
      id: "topic", title: "Atomic transitions", description: null, rankingReason: null,
      score: 8, profileRelevanceScore: 8, technicalDepthScore: 8, freshnessScore: 8, contentPotentialScore: 8,
      status: "DISCOVERED", researchCount: 0, sourceItems: [],
    };
    const synthesis = buildTopicResearchSynthesisPrompt(topic, [{
      id: "s1", title: "Project documentation", url: "https://example.com/project", canonicalUrl: "https://example.com/project",
      publisher: "Example", domain: "example.com", publishedAt: null, type: "PRIMARY", evidence: "Project behavior.", origin: "WEB_SEARCH",
    }]);

    assert.match(synthesis, /directly supports that entity-specific fact/);
    assert.match(synthesis, /Generic technical documentation cannot substitute/);
    assert.match(synthesis, /Compound claims require compound evidence/);
    assert.match(synthesis, /Attribute vendor and project claims precisely/);
    assert.match(synthesis, /multiple narrower findings with precise citations/);
    assert.match(synthesis, /cite all factual premises used to derive them/);
    assert.match(synthesis, /Confidence must reflect support directness/);
    assert.match(synthesis, /Foo requires Serializable isolation/);
    assert.match(synthesis, /sourceIds \["s1", "s2"\]/);
    assert.match(synthesis, /Interlock requires Read Committed/);
  });
});
