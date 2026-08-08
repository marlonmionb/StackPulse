import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasUsefulSummary, isMetadataEnrichmentEligible } from "./eligibility";

describe("metadata enrichment eligibility", () => {
  it("accepts an ARTICLE without a useful summary", () => {
    assert.equal(isMetadataEnrichmentEligible({ contentType: "ARTICLE", summary: null }), true);
    assert.equal(isMetadataEnrichmentEligible({ contentType: "ARTICLE", summary: "  " }), true);
  });

  it("skips ARTICLE records with a summary and all VIDEO records", () => {
    assert.equal(
      isMetadataEnrichmentEligible({ contentType: "ARTICLE", summary: "Existing context" }),
      false,
    );
    assert.equal(isMetadataEnrichmentEligible({ contentType: "VIDEO", summary: null }), false);
    assert.equal(hasUsefulSummary("\n useful \t"), true);
  });
});
