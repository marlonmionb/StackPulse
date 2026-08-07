import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HACKER_NEWS_SEARCH_SOURCE,
  normalizeHackerNewsSearchHit,
} from "./hacker-news-search.normalizer";

describe("normalizeHackerNewsSearchHit", () => {
  it("maps only the fields used by the shared ingestion model", () => {
    assert.deepEqual(
      normalizeHackerNewsSearchHit({
        objectID: "42",
        title: " A targeted story ",
        url: "https://example.com/article",
        author: " ada ",
        created_at: "2026-08-07T12:00:00Z",
        created_at_i: 1_786_104_000,
        story_text: " Existing source summary. ",
        points: 100,
        num_comments: 20,
      }),
      {
        title: "A targeted story",
        url: "https://example.com/article",
        source: HACKER_NEWS_SEARCH_SOURCE,
        author: "ada",
        summary: "Existing source summary.",
        publishedAt: new Date(1_786_104_000_000),
      },
    );
  });

  it("falls back to the ISO publication date", () => {
    const result = normalizeHackerNewsSearchHit({
      title: "Story",
      url: "https://example.com/story",
      created_at: "2026-08-07T12:30:00Z",
    });

    assert.deepEqual(result?.publishedAt, new Date("2026-08-07T12:30:00Z"));
  });

  it("rejects missing titles, self-posts, and non-web URLs", () => {
    assert.equal(
      normalizeHackerNewsSearchHit({ title: "Self post", url: null }),
      null,
    );
    assert.equal(
      normalizeHackerNewsSearchHit({ title: " ", url: "https://example.com" }),
      null,
    );
    assert.equal(
      normalizeHackerNewsSearchHit({ title: "Email", url: "mailto:a@b.com" }),
      null,
    );
  });
});
