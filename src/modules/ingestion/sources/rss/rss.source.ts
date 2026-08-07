import type { ContentSource } from "../content-source";
import { parseRssFeed } from "./rss.parser";
import type { RssFeedItem } from "./rss.types";

export class RssSource implements ContentSource<RssFeedItem> {
  constructor(private readonly feedUrls: string[]) {}

  async fetch(): Promise<RssFeedItem[]> {
    const results = await Promise.all(
      this.feedUrls.map(async (feedUrl) => {
        try {
          const response = await fetch(feedUrl, {
            headers: { accept: "application/atom+xml, application/rss+xml, application/xml, text/xml" },
          });

          if (!response.ok) {
            throw new Error(`request failed with status ${response.status}`);
          }

          return parseRssFeed(await response.text(), feedUrl);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.warn(`Skipping RSS feed ${feedUrl}: ${message}`);
          return [];
        }
      }),
    );

    return results.flat();
  }
}
