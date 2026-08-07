import type { ContentSource } from "../content-source";
import type { HackerNewsItem } from "./hacker-news.types";

const API_BASE_URL = "https://hacker-news.firebaseio.com/v0";
const DETAIL_CONCURRENCY = 6;

function isHackerNewsItem(value: unknown): value is HackerNewsItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "number"
  );
}

export class HackerNewsSource implements ContentSource<HackerNewsItem> {
  constructor(private readonly limit: number) {}

  async fetch(): Promise<HackerNewsItem[]> {
    const storyIds = await this.fetchTopStoryIds();
    return this.fetchStoryDetails(storyIds.slice(0, this.limit));
  }

  private async fetchTopStoryIds(): Promise<number[]> {
    const response = await fetch(`${API_BASE_URL}/topstories.json`);

    if (!response.ok) {
      throw new Error(
        `Hacker News top stories request failed with status ${response.status}.`,
      );
    }

    const payload: unknown = await response.json();

    if (!Array.isArray(payload)) {
      throw new Error("Hacker News top stories response is not an array.");
    }

    return payload.filter(
      (storyId): storyId is number =>
        typeof storyId === "number" && Number.isInteger(storyId),
    );
  }

  private async fetchStoryDetails(storyIds: number[]): Promise<HackerNewsItem[]> {
    const stories: HackerNewsItem[] = [];
    let nextIndex = 0;

    const worker = async () => {
      while (nextIndex < storyIds.length) {
        const storyId = storyIds[nextIndex];
        nextIndex += 1;

        try {
          const story = await this.fetchStory(storyId);

          if (story) {
            stories.push(story);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`Skipping Hacker News item ${storyId}: ${message}`);
        }
      }
    };

    const workerCount = Math.min(DETAIL_CONCURRENCY, storyIds.length);
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return stories;
  }

  private async fetchStory(storyId: number): Promise<HackerNewsItem | null> {
    const response = await fetch(`${API_BASE_URL}/item/${storyId}.json`);

    if (!response.ok) {
      throw new Error(`detail request failed with status ${response.status}`);
    }

    const payload: unknown = await response.json();
    return isHackerNewsItem(payload) ? payload : null;
  }
}
