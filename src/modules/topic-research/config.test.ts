import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTopicResearchConfig } from "./config";

describe("getTopicResearchConfig", () => {
  it("uses the dedicated model and bounded settings", () => assert.deepEqual(getTopicResearchConfig({}), { model: "gpt-5.6-terra", maxOutputTokens: 4_000, maxWebSearchCalls: 4 }));
  it("rejects unbounded search and output settings", () => {
    assert.throws(() => getTopicResearchConfig({ TOPIC_RESEARCH_MAX_WEB_SEARCH_CALLS: "5" }), /1 to 4/);
    assert.throws(() => getTopicResearchConfig({ TOPIC_RESEARCH_MAX_OUTPUT_TOKENS: "0" }), /1 to 8000/);
  });
});
