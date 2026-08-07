import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RSS_SOURCE, normalizeRssItem } from "./rss.normalizer";

describe("normalizeRssItem", () => {
  it("normalizes an RSS item into the shared format", () => {
    assert.deepEqual(
      normalizeRssItem({
        feedUrl: "https://example.com/feed.xml",
        title: " A technical article ",
        url: "https://example.com/article",
        author: " Ada ",
        summary: " A useful summary. ",
        publishedAt: "2026-08-07T12:30:00Z",
      }),
      {
        title: "A technical article",
        url: "https://example.com/article",
        source: RSS_SOURCE,
        author: "Ada",
        summary: "A useful summary.",
        publishedAt: new Date("2026-08-07T12:30:00Z"),
      },
    );
  });

  it("accepts missing optional fields", () => {
    const result = normalizeRssItem({
      feedUrl: "https://example.com/feed.xml",
      title: "Minimal item",
      url: "https://example.com/minimal",
    });

    assert.equal(result?.author, undefined);
    assert.equal(result?.summary, undefined);
    assert.equal(result?.publishedAt, undefined);
  });

  it("ignores an invalid publication date", () => {
    const result = normalizeRssItem({
      feedUrl: "https://example.com/feed.xml",
      title: "Bad date",
      url: "https://example.com/bad-date",
      publishedAt: "not-a-date",
    });

    assert.equal(result?.publishedAt, undefined);
  });

  it("rejects items without a title or HTTP URL", () => {
    assert.equal(
      normalizeRssItem({
        feedUrl: "https://example.com/feed.xml",
        title: "No web link",
        url: "mailto:author@example.com",
      }),
      null,
    );
  });
});
