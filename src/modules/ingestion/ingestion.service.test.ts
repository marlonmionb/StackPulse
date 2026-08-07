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
});
