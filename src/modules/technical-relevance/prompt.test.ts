import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTechnicalRelevancePrompt } from "./prompt";
import type { TechnicalRelevanceCandidate } from "./types";

describe("buildTechnicalRelevancePrompt", () => {
  it("defines a broad, recall-oriented computing gate separate from ranking", () => {
    const item: TechnicalRelevanceCandidate = {
      id: "item-1",
      title: "Example",
      url: "https://example.com/article",
      source: "test",
      contentType: "ARTICLE",
      summary: null,
      publishedAt: null,
    };

    const prompt = buildTechnicalRelevancePrompt([item]);

    assert.match(prompt, /BROAD TECHNICAL RELEVANCE/);
    assert.match(prompt, /Favor recall over precision/);
    assert.match(prompt, /AI training and inference infrastructure/);
    assert.match(prompt, /coarse eligibility gate, not a content-ranking stage/);
    assert.match(prompt, /6-7 for genuinely relevant but adjacent or peripheral/);
    assert.match(prompt, /if relevant is false, category MUST be NON_SOFTWARE/);
  });
});
