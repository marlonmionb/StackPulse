import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildContentKindPrompt } from "./prompt";

describe("ContentKind prompt", () => {
  it("distinguishes editorial purpose from relevance and product marketing", () => {
    const prompt = buildContentKindPrompt([{ id: "one", title: "FooAgent", url: "https://foo.test", source: "rss", contentType: "ARTICLE", summary: "Try autonomous coding today", technicalCategory: "AI" }]);
    assert.match(prompt, /not Technical Relevance/i);
    assert.match(prompt, /primary goal is promotion or sale/i);
    assert.match(prompt, /How we built long-running coding agents/i);
    assert.match(prompt, /external product URL discovered through Hacker News is not DISCUSSION/i);
    assert.doesNotMatch(prompt, /article bod(?:y|ies).*Items:/i);
  });
});
