import type { ContentSource } from "../content-source";
import type {
  HackerNewsSearchHit,
  HackerNewsSearchResponse,
} from "./hacker-news-search.types";

const API_URL = "https://hn.algolia.com/api/v1/search_by_date";
const SECONDS_PER_DAY = 86_400;

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;

function optionalString(value: unknown): string | null | undefined {
  return typeof value === "string" || value === null ? value : undefined;
}

function optionalNumber(value: unknown): number | null | undefined {
  return typeof value === "number" || value === null ? value : undefined;
}

function toSearchHit(value: unknown): HackerNewsSearchHit | null {
  if (typeof value !== "object" || value === null) return null;

  const hit = value as Record<string, unknown>;
  return {
    objectID: optionalString(hit.objectID) ?? undefined,
    title: optionalString(hit.title),
    url: optionalString(hit.url),
    author: optionalString(hit.author),
    created_at: optionalString(hit.created_at),
    created_at_i: optionalNumber(hit.created_at_i),
    story_text: optionalString(hit.story_text),
    points: optionalNumber(hit.points),
    num_comments: optionalNumber(hit.num_comments),
  };
}

function parseResponse(value: unknown): HackerNewsSearchResponse {
  if (
    typeof value !== "object" ||
    value === null ||
    !("hits" in value) ||
    !Array.isArray(value.hits)
  ) {
    throw new Error("response does not contain a hits array");
  }

  return {
    hits: value.hits
      .map(toSearchHit)
      .filter((hit): hit is HackerNewsSearchHit => hit !== null),
  };
}

export function calculateHackerNewsSearchCutoff(
  lookbackDays: number,
  now = new Date(),
): number {
  return Math.floor(now.getTime() / 1_000) - lookbackDays * SECONDS_PER_DAY;
}

export function buildHackerNewsSearchUrl(
  topic: string,
  cutoffTimestamp: number,
  resultsPerTopic: number,
): URL {
  const url = new URL(API_URL);
  url.searchParams.set("query", topic);
  url.searchParams.set("tags", "story");
  url.searchParams.set("numericFilters", `created_at_i>=${cutoffTimestamp}`);
  url.searchParams.set("hitsPerPage", String(resultsPerTopic));
  return url;
}

export class HackerNewsSearchSource
  implements ContentSource<HackerNewsSearchHit>
{
  constructor(
    private readonly topics: string[],
    private readonly lookbackDays: number,
    private readonly resultsPerTopic: number,
    private readonly fetcher: Fetcher = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async fetch(): Promise<HackerNewsSearchHit[]> {
    const cutoffTimestamp = calculateHackerNewsSearchCutoff(
      this.lookbackDays,
      this.now(),
    );
    const results = await Promise.all(
      this.topics.map((topic) => this.fetchTopic(topic, cutoffTimestamp)),
    );

    return results.flat();
  }

  private async fetchTopic(
    topic: string,
    cutoffTimestamp: number,
  ): Promise<HackerNewsSearchHit[]> {
    try {
      const url = buildHackerNewsSearchUrl(
        topic,
        cutoffTimestamp,
        this.resultsPerTopic,
      );
      const response = await this.fetcher(url, {
        headers: { accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`request failed with status ${response.status}`);
      }

      return parseResponse(await response.json()).hits;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Skipping Hacker News search topic "${topic}": ${message}`);
      return [];
    }
  }
}
