export const ContentType = {
  ARTICLE: "ARTICLE",
  VIDEO: "VIDEO",
  UNKNOWN: "UNKNOWN",
} as const;

export type ContentType = (typeof ContentType)[keyof typeof ContentType];

function isYouTubeHostname(hostname: string): boolean {
  return (
    hostname === "youtube.com" ||
    hostname.endsWith(".youtube.com") ||
    hostname === "youtu.be"
  );
}

export function detectContentType(value: string): ContentType {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return ContentType.UNKNOWN;
    }

    return isYouTubeHostname(url.hostname)
      ? ContentType.VIDEO
      : ContentType.ARTICLE;
  } catch {
    return ContentType.UNKNOWN;
  }
}
