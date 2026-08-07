const TRACKING_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
]);

export function canonicalizeUrl(value: string): string {
  const url = new URL(value);

  url.hash = "";

  for (const parameter of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMETERS.has(parameter.toLowerCase())) {
      url.searchParams.delete(parameter);
    }
  }

  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

export function normalizeTitle(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[‐‑‒–—―]/g, "-");
}

export type DeduplicatedSourceItem = NormalizedSourceItem & {
  canonicalUrl: string;
};

type ExistingSourceItemIdentity = {
  url: string;
  canonicalUrl: string | null;
};

export function selectNewSourceItems(
  items: NormalizedSourceItem[],
  existingItems: ExistingSourceItemIdentity[],
): DeduplicatedSourceItem[] {
  const uniqueItemsByCanonicalUrl = new Map<string, NormalizedSourceItem>();

  for (const item of items) {
    const canonicalUrl = canonicalizeUrl(item.url);

    if (!uniqueItemsByCanonicalUrl.has(canonicalUrl)) {
      uniqueItemsByCanonicalUrl.set(canonicalUrl, item);
    }
  }

  const uniqueItems = [...uniqueItemsByCanonicalUrl].map(
    ([canonicalUrl, item]) => ({ ...item, canonicalUrl }),
  );

  const existingUrls = new Set(existingItems.map((item) => item.url));
  const existingCanonicalUrls = new Set(
    existingItems.map((item) => item.canonicalUrl ?? canonicalizeUrl(item.url)),
  );

  return uniqueItems.filter(
    (item) =>
      !existingUrls.has(item.url) &&
      !existingCanonicalUrls.has(item.canonicalUrl),
  );
}
import type { NormalizedSourceItem } from "./normalized-source-item";
