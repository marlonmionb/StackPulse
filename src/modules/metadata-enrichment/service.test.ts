import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MetadataEnrichmentRepository } from "./repository";
import { enrichSourceMetadata } from "./service";
import type {
  MetadataEnrichmentCandidate,
  MetadataEnrichmentResult,
} from "./types";

function candidate(
  id: string,
  overrides: Partial<MetadataEnrichmentCandidate> = {},
): MetadataEnrichmentCandidate {
  return {
    id,
    url: `https://example.com/${id}`,
    contentType: "ARTICLE",
    summary: null,
    metadataEnrichmentStatus: "PENDING",
    ...overrides,
  };
}

function fakeRepository(
  candidates: MetadataEnrichmentCandidate[],
  persisted: Array<{ id: string; result: MetadataEnrichmentResult }>,
): MetadataEnrichmentRepository {
  return {
    async findCandidates() {
      return candidates;
    },
    async persistResult(id, result) {
      persisted.push({ id, result });
      return true;
    },
  };
}

describe("enrichSourceMetadata", () => {
  it("persists successful metadata and NO_METADATA without overwriting context", async () => {
    const persisted: Array<{ id: string; result: MetadataEnrichmentResult }> = [];
    const fetches: string[] = [];
    const repository = fakeRepository([
      candidate("found"),
      candidate("empty"),
      candidate("existing", { summary: "Source-provided summary" }),
      candidate("video", { contentType: "VIDEO" }),
    ], persisted);

    const summary = await enrichSourceMetadata({ concurrency: 2 }, {
      repository,
      fetchHtml: async (url) => {
        fetches.push(url);
        return url.endsWith("found")
          ? { kind: "HTML", html: '<meta name="description" content="Useful context">' }
          : { kind: "HTML", html: "<title>No description</title>" };
      },
    });

    assert.deepEqual(persisted, [
      { id: "found", result: { status: "ENRICHED", summary: "Useful context" } },
      { id: "empty", result: { status: "NO_METADATA" } },
    ]);
    assert.equal(fetches.length, 2);
    assert.deepEqual(summary, {
      candidates: 4,
      enriched: 1,
      noMetadata: 1,
      failed: 0,
      skipped: 2,
    });
  });

  it("records network failures as FAILED without deleting the SourceItem", async () => {
    const persisted: Array<{ id: string; result: MetadataEnrichmentResult }> = [];
    const summary = await enrichSourceMetadata({}, {
      repository: fakeRepository([candidate("failure")], persisted),
      fetchHtml: async () => {
        throw new Error("network unavailable");
      },
    });
    assert.deepEqual(persisted, [{ id: "failure", result: { status: "FAILED" } }]);
    assert.equal(summary.failed, 1);
  });

  it("counts a persistence race with a newly added summary as skipped", async () => {
    const repository: MetadataEnrichmentRepository = {
      async findCandidates() {
        return [candidate("race")];
      },
      async persistResult() {
        return false;
      },
    };
    const summary = await enrichSourceMetadata({}, {
      repository,
      fetchHtml: async () => ({
        kind: "HTML",
        html: '<meta name="description" content="Fetched context">',
      }),
    });
    assert.equal(summary.skipped, 1);
    assert.equal(summary.enriched, 0);
  });

  it("honors the configured worker concurrency", async () => {
    const persisted: Array<{ id: string; result: MetadataEnrichmentResult }> = [];
    let active = 0;
    let maximumActive = 0;
    const items = Array.from({ length: 6 }, (_, index) => candidate(String(index)));

    await enrichSourceMetadata({ concurrency: 2 }, {
      repository: fakeRepository(items, persisted),
      fetchHtml: async () => {
        active += 1;
        maximumActive = Math.max(maximumActive, active);
        await new Promise<void>((resolve) => setImmediate(resolve));
        active -= 1;
        return { kind: "NO_METADATA" };
      },
    });

    assert.equal(maximumActive, 2);
    assert.equal(persisted.length, 6);
  });
});
