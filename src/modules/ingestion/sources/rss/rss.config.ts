const DEFAULT_FEED_URLS = [
  "https://blog.cloudflare.com/rss/",
  "https://github.blog/changelog/feed/",
  "https://web.dev/feed.xml",
];

export function getRssFeedUrls(
  configuredValue = process.env.RSS_FEED_URLS,
): string[] {
  const values = configuredValue?.trim()
    ? configuredValue.split(",")
    : DEFAULT_FEED_URLS;

  const urls = values.map((value) => value.trim()).filter(Boolean);

  if (urls.length === 0) {
    throw new Error("RSS_FEED_URLS must contain at least one feed URL.");
  }

  return urls.map((value) => {
    try {
      const url = new URL(value);

      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw new Error();
      }

      return url.toString();
    } catch {
      throw new Error(`RSS_FEED_URLS contains an invalid URL: ${value}`);
    }
  });
}
