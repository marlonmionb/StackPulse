import type { MetadataEnrichmentCandidate } from "./types";

export function hasUsefulSummary(summary: string | null | undefined): boolean {
  return typeof summary === "string" && summary.trim().length > 0;
}

export function isMetadataEnrichmentEligible(
  item: Pick<MetadataEnrichmentCandidate, "contentType" | "summary">,
): boolean {
  return item.contentType === "ARTICLE" && !hasUsefulSummary(item.summary);
}
