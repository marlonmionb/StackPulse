import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildMetadataEnrichmentCandidateWhere, candidateStatuses } from "./repository";

describe("metadata enrichment repository selection", () => {
  it("selects only ARTICLE records and defaults to never-attempted items", () => {
    assert.deepEqual(buildMetadataEnrichmentCandidateWhere(false), {
      contentType: "ARTICLE",
      metadataEnrichmentStatus: { in: ["PENDING"] },
    });
  });

  it("force retries failed and metadata-empty records but never enriched records", () => {
    assert.deepEqual(candidateStatuses(true), ["PENDING", "NO_METADATA", "FAILED"]);
    assert.equal(candidateStatuses(true).includes("ENRICHED"), false);
  });
});
