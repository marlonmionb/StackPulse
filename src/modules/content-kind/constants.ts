export const CONTENT_KIND_MODEL = "gpt-5.4-nano";
export const CONTENT_KIND_BATCH_SIZE = 25;
export const CONTENT_KIND_MAX_OUTPUT_TOKENS = 2_000;
export const CONTENT_KIND_FEATURE = "content-kind";

export const CONTENT_KINDS = [
  "TECHNICAL_ARTICLE",
  "TECHNICAL_NEWS",
  "OFFICIAL_TECHNICAL",
  "RESEARCH",
  "REPOSITORY",
  "PRODUCT_PAGE",
  "DISCUSSION",
  "OTHER",
] as const;

export type ContentKind = (typeof CONTENT_KINDS)[number];

export const CONTENT_KIND_CONFIDENCES = ["HIGH", "MEDIUM", "LOW"] as const;
export type ContentKindConfidence = (typeof CONTENT_KIND_CONFIDENCES)[number];
