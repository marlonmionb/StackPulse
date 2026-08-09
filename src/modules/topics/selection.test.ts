import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { deriveTopicSelectability } from "./selection";

const evaluatedAt = new Date("2026-08-09T12:00:00Z");
function support(contentKind: "TECHNICAL_ARTICLE" | "PRODUCT_PAGE" | "OTHER") {
  return {
    contentType: "ARTICLE" as const, technicalRelevant: true, technicalRelevanceEvaluatedAt: evaluatedAt,
    contentKind, contentKindEvaluatedAt: evaluatedAt, metadataEnrichmentStatus: "PENDING" as const,
    metadataEnrichmentAttemptedAt: null,
  };
}

describe("deriveTopicSelectability", () => {
  it("keeps a currently eligible Topic selectable", () => assert.equal(deriveTopicSelectability("DISCOVERED", [support("TECHNICAL_ARTICLE")]).selectable, true));
  it("marks PRODUCT_PAGE-only and OTHER-only historical Topics stale without deleting them", () => {
    assert.equal(deriveTopicSelectability("DISCOVERED", [support("PRODUCT_PAGE")]).label, "STALE");
    assert.equal(deriveTopicSelectability("DISCOVERED", [support("OTHER")]).selectable, false);
  });
  it("keeps RESEARCHED selectable for explicit forced history and blocks ARCHIVED separately", () => {
    assert.equal(deriveTopicSelectability("RESEARCHED", [support("TECHNICAL_ARTICLE")]).selectable, true);
    assert.equal(deriveTopicSelectability("ARCHIVED", [support("TECHNICAL_ARTICLE")]).label, "LIFECYCLE_BLOCKED");
  });
});
