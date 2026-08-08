import { parse } from "node-html-parser";
import { METADATA_ENRICHMENT_MAX_DESCRIPTION_LENGTH } from "./config";

const DESCRIPTION_KEYS = ["description", "og:description", "twitter:description"] as const;

export function normalizeMetadataDescription(
  value: string | null | undefined,
  maxLength = METADATA_ENRICHMENT_MAX_DESCRIPTION_LENGTH,
): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength).trim();
}

export function extractMetadataDescription(html: string): string | null {
  const root = parse(html);
  const values = new Map<string, string>();

  for (const meta of root.querySelectorAll("meta")) {
    const key = (meta.getAttribute("name") ?? meta.getAttribute("property"))
      ?.trim()
      .toLowerCase();
    const content = normalizeMetadataDescription(meta.getAttribute("content"));
    if (key && content && !values.has(key)) values.set(key, content);
  }

  for (const key of DESCRIPTION_KEYS) {
    const description = values.get(key);
    if (description) return description;
  }
  return null;
}
