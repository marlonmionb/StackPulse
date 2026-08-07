import type { NormalizedSourceItem } from "../normalized-source-item";
import type { HackerNewsSearchHit } from "../sources/hacker-news-search/hacker-news-search.types";

export const HACKER_NEWS_SEARCH_SOURCE = "hacker-news-search";

function normalizeUrl(value: string | null | undefined): string | null {
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

function normalizePublishedAt(hit: HackerNewsSearchHit): Date | undefined {
  const value =
    typeof hit.created_at_i === "number" && Number.isFinite(hit.created_at_i)
      ? hit.created_at_i * 1_000
      : hit.created_at;

  if (value === null || value === undefined || value === "") return undefined;

  const publishedAt = new Date(value);
  return Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt;
}

export function normalizeHackerNewsSearchHit(
  hit: HackerNewsSearchHit,
): NormalizedSourceItem | null {
  const title = hit.title?.trim();
  const url = normalizeUrl(hit.url);

  if (!title || !url) return null;

  return {
    title,
    url,
    source: HACKER_NEWS_SEARCH_SOURCE,
    author: hit.author?.trim() || undefined,
    summary: hit.story_text?.trim() || undefined,
    publishedAt: normalizePublishedAt(hit),
  };
}
