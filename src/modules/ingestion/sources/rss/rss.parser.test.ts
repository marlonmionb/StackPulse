import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseRssFeed } from "./rss.parser";

describe("parseRssFeed", () => {
  it("extracts RSS 2.0 fields and tolerates missing optional fields", () => {
    const items = parseRssFeed(`
      <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <channel>
          <item>
            <title>First article</title>
            <link>https://example.com/first</link>
            <dc:creator>Ada</dc:creator>
            <description>Summary</description>
            <pubDate>Fri, 07 Aug 2026 12:30:00 GMT</pubDate>
          </item>
          <item><title>Minimal</title><link>https://example.com/minimal</link></item>
        </channel>
      </rss>`, "https://example.com/rss.xml");

    assert.equal(items.length, 2);
    assert.deepEqual(items[0], {
      feedUrl: "https://example.com/rss.xml",
      title: "First article",
      url: "https://example.com/first",
      author: "Ada",
      summary: "Summary",
      publishedAt: "Fri, 07 Aug 2026 12:30:00 GMT",
    });
    assert.equal(items[1].author, undefined);
  });

  it("extracts Atom fields and selects the alternate link", () => {
    const [item] = parseRssFeed(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <title>Atom article</title>
          <link rel="self" href="https://example.com/entry.xml" />
          <link rel="alternate" href="https://example.com/atom" />
          <author><name>Grace</name></author>
          <summary>Atom summary</summary>
          <updated>2026-08-07T12:30:00Z</updated>
        </entry>
      </feed>`, "https://example.com/atom.xml");

    assert.equal(item.url, "https://example.com/atom");
    assert.equal(item.author, "Grace");
    assert.equal(item.publishedAt, "2026-08-07T12:30:00Z");
  });

  it("rejects XML that is not an RSS or Atom feed", () => {
    assert.throws(
      () => parseRssFeed("<document />", "https://example.com/feed"),
      /neither an RSS nor an Atom feed/,
    );
  });
});
