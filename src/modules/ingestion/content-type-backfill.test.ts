import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentType } from "./content-type";
import {
  backfillContentTypes,
  buildContentTypeBackfillCandidateWhere,
  type ContentTypeBackfillRepository,
} from "./content-type-backfill";

type Record = {
  id: string;
  url: string;
  contentType: (typeof ContentType)[keyof typeof ContentType];
  title: string;
  summary: string | null;
};

function inMemoryRepository(records: Record[]): ContentTypeBackfillRepository {
  return {
    async findCandidates(limit) {
      const candidates = records
        .filter((record) => record.contentType === ContentType.UNKNOWN)
        .map(({ id, url }) => ({ id, url }));
      return limit === undefined ? candidates : candidates.slice(0, limit);
    },
    async updateIfUnknown(id, contentType) {
      const record = records.find((item) => item.id === id);
      if (!record || record.contentType !== ContentType.UNKNOWN) return false;
      record.contentType = contentType;
      return true;
    },
  };
}

describe("backfillContentTypes", () => {
  it("selects only UNKNOWN records", () => {
    assert.deepEqual(buildContentTypeBackfillCandidateWhere(), {
      contentType: ContentType.UNKNOWN,
    });
  });

  it("classifies normal HTTP(S) articles and YouTube videos without changing other fields", async () => {
    const records: Record[] = [
      {
        id: "article",
        url: "https://example.com/legacy-article",
        contentType: ContentType.UNKNOWN,
        title: "Original article title",
        summary: "Original summary",
      },
      {
        id: "video",
        url: "https://www.youtube.com/watch?v=legacy",
        contentType: ContentType.UNKNOWN,
        title: "Original video title",
        summary: null,
      },
    ];

    const summary = await backfillContentTypes({}, inMemoryRepository(records));

    assert.deepEqual(summary, {
      candidates: 2,
      articles: 1,
      videos: 1,
      stillUnknown: 0,
    });
    assert.deepEqual(records, [
      {
        id: "article",
        url: "https://example.com/legacy-article",
        contentType: ContentType.ARTICLE,
        title: "Original article title",
        summary: "Original summary",
      },
      {
        id: "video",
        url: "https://www.youtube.com/watch?v=legacy",
        contentType: ContentType.VIDEO,
        title: "Original video title",
        summary: null,
      },
    ]);
  });

  it("leaves already classified and unsupported records untouched", async () => {
    const records: Record[] = [
      {
        id: "existing-article",
        url: "https://youtube.com/watch?v=do-not-change",
        contentType: ContentType.ARTICLE,
        title: "Already classified article",
        summary: null,
      },
      {
        id: "existing-video",
        url: "https://example.com/do-not-change",
        contentType: ContentType.VIDEO,
        title: "Already classified video",
        summary: null,
      },
      {
        id: "unsupported",
        url: "mailto:legacy@example.com",
        contentType: ContentType.UNKNOWN,
        title: "Unsupported link",
        summary: null,
      },
    ];

    const summary = await backfillContentTypes({}, inMemoryRepository(records));

    assert.deepEqual(summary, {
      candidates: 1,
      articles: 0,
      videos: 0,
      stillUnknown: 1,
    });
    assert.equal(records[0].contentType, ContentType.ARTICLE);
    assert.equal(records[1].contentType, ContentType.VIDEO);
    assert.equal(records[2].contentType, ContentType.UNKNOWN);
  });

  it("is idempotent when rerun", async () => {
    const records: Record[] = [
      {
        id: "article",
        url: "https://example.com/article",
        contentType: ContentType.UNKNOWN,
        title: "Article",
        summary: null,
      },
      {
        id: "ambiguous",
        url: "not-a-url",
        contentType: ContentType.UNKNOWN,
        title: "Ambiguous",
        summary: null,
      },
    ];
    const repository = inMemoryRepository(records);

    const first = await backfillContentTypes({}, repository);
    const afterFirstRun = structuredClone(records);
    const second = await backfillContentTypes({}, repository);

    assert.deepEqual(first, {
      candidates: 2,
      articles: 1,
      videos: 0,
      stillUnknown: 1,
    });
    assert.deepEqual(second, {
      candidates: 1,
      articles: 0,
      videos: 0,
      stillUnknown: 1,
    });
    assert.deepEqual(records, afterFirstRun);
  });

  it("honors a positive candidate limit", async () => {
    const records: Record[] = [
      {
        id: "first",
        url: "https://example.com/first",
        contentType: ContentType.UNKNOWN,
        title: "First",
        summary: null,
      },
      {
        id: "second",
        url: "https://example.com/second",
        contentType: ContentType.UNKNOWN,
        title: "Second",
        summary: null,
      },
    ];

    const summary = await backfillContentTypes(
      { limit: 1 },
      inMemoryRepository(records),
    );

    assert.equal(summary.candidates, 1);
    assert.equal(records[0].contentType, ContentType.ARTICLE);
    assert.equal(records[1].contentType, ContentType.UNKNOWN);
  });
});
