import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HACKER_NEWS_SOURCE,
  normalizeHackerNewsItem,
} from "./hacker-news.normalizer";

describe("normalizeHackerNewsItem", () => {
  it("normalizes the fields used by StackPulse", () => {
    const result = normalizeHackerNewsItem({
      id: 1,
      type: "story",
      by: "pg",
      time: 1_700_000_000,
      title: "A technical story",
      url: "https://example.com/article",
    });

    assert.deepEqual(result, {
      title: "A technical story",
      url: "https://example.com/article",
      source: HACKER_NEWS_SOURCE,
      author: "pg",
      publishedAt: new Date(1_700_000_000_000),
    });
  });

  it("rejects items that are not stories", () => {
    assert.equal(
      normalizeHackerNewsItem({
        id: 2,
        type: "comment",
        title: "Comment",
        url: "https://example.com/comment",
      }),
      null,
    );
  });

  it("rejects stories without a title or usable URL", () => {
    assert.equal(
      normalizeHackerNewsItem({
        id: 3,
        type: "story",
        title: "   ",
        url: "not-a-url",
      }),
      null,
    );
  });

  it("does not invent optional values", () => {
    const result = normalizeHackerNewsItem({
      id: 4,
      type: "story",
      title: "Minimal story",
      url: "https://example.com/minimal",
    });

    assert.equal(result?.author, undefined);
    assert.equal(result?.summary, undefined);
    assert.equal(result?.publishedAt, undefined);
  });

  it("ignores an invalid Unix timestamp without rejecting the story", () => {
    const result = normalizeHackerNewsItem({
      id: 5,
      type: "story",
      time: Number.MAX_VALUE,
      title: "Story with malformed time",
      url: "https://example.com/malformed-time",
    });

    assert.equal(result?.publishedAt, undefined);
  });
});
