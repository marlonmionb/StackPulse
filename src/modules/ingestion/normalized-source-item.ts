import type { ContentType } from "./content-type";

export type NormalizedSourceItem = {
  title: string;
  url: string;
  source: string;
  author?: string;
  summary?: string;
  publishedAt?: Date;
};

export type ClassifiedSourceItem = NormalizedSourceItem & {
  contentType: ContentType;
};
