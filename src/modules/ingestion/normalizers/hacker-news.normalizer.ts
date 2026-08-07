import type { NormalizedSourceItem } from "../normalized-source-item";
import type { HackerNewsItem } from "../sources/hacker-news/hacker-news.types";

export const HACKER_NEWS_SOURCE = "hacker-news";

function normalizeUrl(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function normalizePublishedAt(timestamp: number | undefined): Date | undefined {
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    return undefined;
  }

  const publishedAt = new Date(timestamp * 1_000);
  return Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt;
}

export function normalizeHackerNewsItem(
  item: HackerNewsItem,
): NormalizedSourceItem | null {
  const title = item.title?.trim();
  const url = normalizeUrl(item.url);

  if (item.type !== "story" || !title || !url) {
    return null;
  }

  const author = item.by?.trim() || undefined;
  const publishedAt = normalizePublishedAt(item.time);

  return {
    title,
    url,
    source: HACKER_NEWS_SOURCE,
    author,
    publishedAt,
  };
}
