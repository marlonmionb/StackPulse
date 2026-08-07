import { prisma } from "@/lib/db/prisma";
import type { NormalizedSourceItem } from "./normalized-source-item";
import type { ContentSource } from "./sources/content-source";
import { selectNewSourceItems } from "./deduplication";

export type IngestionSummary = {
  fetched: number;
  normalized: number;
  inserted: number;
  skipped: number;
};

type Normalizer<T> = (item: T) => NormalizedSourceItem | null;

export class IngestionService<T> {
  constructor(
    private readonly source: ContentSource<T>,
    private readonly normalize: Normalizer<T>,
  ) {}

  async run(): Promise<IngestionSummary> {
    const rawItems = await this.source.fetch();
    const normalizedItems = rawItems
      .map(this.normalize)
      .filter((item): item is NormalizedSourceItem => item !== null);

    const existingItems = await prisma.sourceItem.findMany({
      select: { url: true, canonicalUrl: true },
    });
    const newItems = selectNewSourceItems(normalizedItems, existingItems);

    const result = await prisma.sourceItem.createMany({ data: newItems });

    return {
      fetched: rawItems.length,
      normalized: normalizedItems.length,
      inserted: result.count,
      skipped: rawItems.length - result.count,
    };
  }
}
