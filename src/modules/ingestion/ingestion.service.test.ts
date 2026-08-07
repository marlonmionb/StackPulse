import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentType } from "./content-type";
import type { DeduplicatedSourceItem } from "./deduplication";
import { IngestionService } from "./ingestion.service";

describe("IngestionService", () => {
  it("classifies and passes video records to persistence", async () => {
    const persisted: DeduplicatedSourceItem[] = [];
    const source = {
      async fetch() {
        return [
          {
            title: "Interesting Java conference talk",
            url: "https://youtube.com/watch?v=abc",
          },
        ];
      },
    };
    const sourceItems = {
      async findMany() {
        return [];
      },
      async createMany({ data }: { data: DeduplicatedSourceItem[] }) {
        persisted.push(...data);
        return { count: data.length };
      },
    };
    const service = new IngestionService(
      source,
      (item) => ({ ...item, source: "test-source" }),
      sourceItems,
    );

    const summary = await service.run();

    assert.equal(summary.inserted, 1);
    assert.equal(persisted.length, 1);
    assert.equal(persisted[0].contentType, ContentType.VIDEO);
    assert.equal(persisted[0].url, "https://youtube.com/watch?v=abc");
  });

  it("collapses cross-query canonical duplicates and preserves video classification", async () => {
    const persisted: DeduplicatedSourceItem[] = [];
    const source = {
      async fetch() {
        return [
          {
            title: "PostgreSQL performance",
            url: "https://example.com/postgres?utm_source=react",
          },
          {
            title: "Same story from another query",
            url: "https://example.com/postgres#results",
          },
          {
            title: "Conference recording",
            url: "https://youtu.be/abc",
          },
        ];
      },
    };
    const sourceItems = {
      async findMany() {
        return [];
      },
      async createMany({ data }: { data: DeduplicatedSourceItem[] }) {
        persisted.push(...data);
        return { count: data.length };
      },
    };
    const service = new IngestionService(
      source,
      (item) => ({ ...item, source: "hacker-news-search" }),
      sourceItems,
    );

    const summary = await service.run();

    assert.deepEqual(summary, {
      fetched: 3,
      normalized: 3,
      inserted: 2,
      skipped: 1,
    });
    assert.equal(persisted[1].contentType, ContentType.VIDEO);
  });
});
