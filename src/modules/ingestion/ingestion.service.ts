import { prisma } from "@/lib/db/prisma";
import type { NormalizedSourceItem } from "./normalized-source-item";
import type { ContentSource } from "./sources/content-source";

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

    const uniqueItems = [
      ...new Map(normalizedItems.map((item) => [item.url, item])).values(),
    ];

    const existingItems = await prisma.sourceItem.findMany({
      where: { url: { in: uniqueItems.map((item) => item.url) } },
      select: { url: true },
    });
    const existingUrls = new Set(existingItems.map((item) => item.url));
    const newItems = uniqueItems.filter((item) => !existingUrls.has(item.url));

    const result = await prisma.sourceItem.createMany({ data: newItems });

    return {
      fetched: rawItems.length,
      normalized: normalizedItems.length,
      inserted: result.count,
      skipped: rawItems.length - result.count,
    };
  }
}
