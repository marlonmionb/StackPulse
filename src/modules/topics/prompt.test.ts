import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTopicDiscoveryPrompt } from "./prompt";

describe("Topic Discovery prompt source-quality contract", () => {
  it("prevents a single tool source from becoming an unsupported trend", () => {
    const prompt = buildTopicDiscoveryPrompt([{ id: "repo", title: "FooAgent", url: "https://github.com/foo/agent", source: "hn", summary: null, publishedAt: new Date(), technicalCategory: "AI", technicalRelevanceScore: 9, contentKind: "REPOSITORY", sourceStrength: "SUPPORTING" }], ["AI engineering"], 10);
    assert.match(prompt, /Never generalize a single product announcement[\s\S]*broad ecosystem or industry trend/);
    assert.match(prompt, /AI-native code review is transforming software engineering[\s\S]*is not/);
    assert.match(prompt, /source quality and independence/i);
    assert.match(prompt, /"contentKind":"REPOSITORY"/);
  });
});
