import type { NormalizedSourceItem } from "../normalized-source-item";
import type { RssFeedItem } from "../sources/rss/rss.types";

export const RSS_SOURCE = "rss";

function normalizeUrl(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizePublishedAt(value: string | undefined): Date | undefined {
  if (!value) return undefined;

  const publishedAt = new Date(value);
  return Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt;
}

export function normalizeRssItem(
  item: RssFeedItem,
): NormalizedSourceItem | null {
  const title = item.title?.trim();
  const url = normalizeUrl(item.url);

  if (!title || !url) return null;

  return {
    title,
    url,
    source: RSS_SOURCE,
    author: item.author?.trim() || undefined,
    summary: item.summary?.trim() || undefined,
    publishedAt: normalizePublishedAt(item.publishedAt),
  };
}
