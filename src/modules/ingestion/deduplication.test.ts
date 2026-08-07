import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalizeUrl,
  normalizeTitle,
  selectNewSourceItems,
} from "./deduplication";

describe("canonicalizeUrl", () => {
  it("removes common tracking parameters while preserving meaningful ones", () => {
    assert.equal(
      canonicalizeUrl(
        "https://Example.COM/article?id=42&utm_source=hackernews&utm_medium=social&gclid=abc",
      ),
      "https://example.com/article?id=42",
    );
  });

  it("removes fragments", () => {
    assert.equal(
      canonicalizeUrl("https://example.com/article#comments"),
      "https://example.com/article",
    );
  });

  it("normalizes the hostname", () => {
    assert.equal(
      canonicalizeUrl("https://EXAMPLE.COM/article"),
      "https://example.com/article",
    );
  });

  it("removes trailing slashes from non-root paths only", () => {
    assert.equal(
      canonicalizeUrl("https://example.com/article///"),
      "https://example.com/article",
    );
    assert.equal(canonicalizeUrl("https://example.com/"), "https://example.com/");
  });

  it("gives equivalent URLs the same representation", () => {
    const expected = canonicalizeUrl("https://example.com/article");

    for (const value of [
      "https://example.com/article/",
      "https://example.com/article?utm_campaign=test",
      "https://EXAMPLE.COM/article#section",
    ]) {
      assert.equal(canonicalizeUrl(value), expected);
    }
  });

  it("keeps clearly different resources distinct", () => {
    assert.notEqual(
      canonicalizeUrl("https://example.com/article?id=1"),
      canonicalizeUrl("https://example.com/article?id=2"),
    );
    assert.notEqual(
      canonicalizeUrl("http://example.com/article"),
      canonicalizeUrl("https://example.com/article"),
    );
  });
});

describe("normalizeTitle", () => {
  it("normalizes whitespace, case, Unicode width, and obvious punctuation variants", () => {
    assert.equal(
      normalizeTitle("  What\tIs  New — Today “Really”  "),
      'what is new - today "really"',
    );
    assert.equal(normalizeTitle("Ｆｕｌｌ　Ｗｉｄｔｈ"), "full width");
  });
});

describe("selectNewSourceItems", () => {
  it("is idempotent across equivalent URLs and persisted records", () => {
    const candidates = [
      { title: "Original", url: "https://example.com/article", source: "rss" },
      {
        title: "Tracked",
        url: "https://example.com/article/?utm_source=hackernews",
        source: "hacker-news",
      },
    ];

    const firstRun = selectNewSourceItems(candidates, []);
    assert.equal(firstRun.length, 1);
    assert.equal(firstRun[0].url, "https://example.com/article");

    const secondRun = selectNewSourceItems(candidates, [
      { url: firstRun[0].url, canonicalUrl: firstRun[0].canonicalUrl },
    ]);
    assert.deepEqual(secondRun, []);
  });

  it("compares legacy records by canonicalizing their original URL", () => {
    const result = selectNewSourceItems(
      [{ title: "Item", url: "https://example.com/item", source: "rss" }],
      [
        {
          url: "https://example.com/item/?utm_campaign=old",
          canonicalUrl: null,
        },
      ],
    );

    assert.deepEqual(result, []);
  });
});
