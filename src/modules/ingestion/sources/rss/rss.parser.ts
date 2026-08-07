import { XMLParser } from "fast-xml-parser";
import type { RssFeedItem } from "./rss.types";

type XmlValue = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  processEntities: true,
  trimValues: true,
});

function asRecord(value: unknown): XmlValue | undefined {
  return typeof value === "object" && value !== null
    ? (value as XmlValue)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function text(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    const result = String(value).trim();
    return result || undefined;
  }

  const record = asRecord(value);
  return record ? text(record["#text"]) : undefined;
}

function atomLink(value: unknown): string | undefined {
  for (const candidate of asArray(value)) {
    const record = asRecord(candidate);
    const relation = text(record?.["@_rel"]);
    const href = text(record?.["@_href"]);

    if (href && (!relation || relation === "alternate")) {
      return href;
    }
  }

  return undefined;
}

function author(value: unknown): string | undefined {
  const record = asRecord(value);
  return text(record?.name) ?? text(value);
}

function parseRssItems(root: XmlValue, feedUrl: string): RssFeedItem[] {
  const channel = asRecord(asRecord(root.rss)?.channel);

  return asArray(channel?.item).map((value) => {
    const item = asRecord(value) ?? {};
    return {
      feedUrl,
      title: text(item.title),
      url: text(item.link) ?? text(item.guid),
      author: text(item["dc:creator"]) ?? text(item.author),
      summary: text(item.description) ?? text(item["content:encoded"]),
      publishedAt: text(item.pubDate) ?? text(item["dc:date"]),
    };
  });
}

function parseAtomItems(root: XmlValue, feedUrl: string): RssFeedItem[] {
  const feed = asRecord(root.feed);

  return asArray(feed?.entry).map((value) => {
    const entry = asRecord(value) ?? {};
    return {
      feedUrl,
      title: text(entry.title),
      url: atomLink(entry.link) ?? text(entry.id),
      author: author(entry.author),
      summary: text(entry.summary) ?? text(entry.content),
      publishedAt: text(entry.published) ?? text(entry.updated),
    };
  });
}

export function parseRssFeed(xml: string, feedUrl: string): RssFeedItem[] {
  const root = asRecord(parser.parse(xml));

  if (!root) {
    throw new Error("Feed XML did not contain a document root.");
  }

  if (root.rss) {
    return parseRssItems(root, feedUrl);
  }

  if (root.feed) {
    return parseAtomItems(root, feedUrl);
  }

  throw new Error("Document is neither an RSS nor an Atom feed.");
}
