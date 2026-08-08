import type { ContentType, MetadataEnrichmentStatus } from "@prisma/client";

export type MetadataEnrichmentCandidate = {
  id: string;
  url: string;
  contentType: ContentType;
  summary: string | null;
  metadataEnrichmentStatus: MetadataEnrichmentStatus;
};

export type MetadataEnrichmentResult = {
  status: Exclude<MetadataEnrichmentStatus, "PENDING">;
  summary?: string;
};

export type MetadataEnrichmentSummary = {
  candidates: number;
  enriched: number;
  noMetadata: number;
  failed: number;
  skipped: number;
};
