import { prisma } from "@/lib/db/prisma";
import type { NormalizedSourceItem } from "./normalized-source-item";
import type { ContentSource } from "./sources/content-source";
import {
  selectNewSourceItems,
  type DeduplicatedSourceItem,
} from "./deduplication";
import { detectContentType } from "./content-type";

export type IngestionSummary = {
  fetched: number;
  normalized: number;
  inserted: number;
  skipped: number;
};

type Normalizer<T> = (item: T) => NormalizedSourceItem | null;

type SourceItemPersistence = {
  findMany(args: {
    select: { url: true; canonicalUrl: true };
  }): Promise<Array<{ url: string; canonicalUrl: string | null }>>;
  createMany(args: {
    data: DeduplicatedSourceItem[];
  }): Promise<{ count: number }>;
};

export class IngestionService<T> {
  constructor(
    private readonly source: ContentSource<T>,
    private readonly normalize: Normalizer<T>,
    private readonly sourceItems: SourceItemPersistence = prisma.sourceItem,
  ) {}

  async run(): Promise<IngestionSummary> {
    const rawItems = await this.source.fetch();
    const normalizedItems = rawItems
      .map(this.normalize)
      .filter((item): item is NormalizedSourceItem => item !== null);
    const classifiedItems = normalizedItems.map((item) => ({
      ...item,
      contentType: detectContentType(item.url),
    }));

    const existingItems = await this.sourceItems.findMany({
      select: { url: true, canonicalUrl: true },
    });
    const newItems = selectNewSourceItems(classifiedItems, existingItems);

    const result = await this.sourceItems.createMany({ data: newItems });

    return {
      fetched: rawItems.length,
      normalized: normalizedItems.length,
      inserted: result.count,
      skipped: rawItems.length - result.count,
    };
  }
}
