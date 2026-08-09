import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentType } from "../ingestion/content-type";
import { isEligibleForTopicDiscovery } from "./candidate-selection";

describe("isEligibleForTopicDiscovery", () => {
  const evaluatedAt = new Date("2026-08-07T12:00:00Z");
  const freshness = { metadataEnrichmentStatus: "PENDING" as const, metadataEnrichmentAttemptedAt: null };

  it("requires a relevant AI evaluation and excludes videos", () => {
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.VIDEO,
        technicalRelevant: true,
        technicalRelevanceEvaluatedAt: evaluatedAt,
        contentKind: "TECHNICAL_ARTICLE",
        contentKindEvaluatedAt: evaluatedAt,
        ...freshness,
      }),
      false,
    );
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.ARTICLE,
        technicalRelevant: true,
        technicalRelevanceEvaluatedAt: evaluatedAt,
        contentKind: "TECHNICAL_ARTICLE",
        contentKindEvaluatedAt: evaluatedAt,
        ...freshness,
      }),
      true,
    );
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.ARTICLE,
        technicalRelevant: false,
        technicalRelevanceEvaluatedAt: evaluatedAt,
        contentKind: "TECHNICAL_ARTICLE",
        contentKindEvaluatedAt: evaluatedAt,
        ...freshness,
      }),
      false,
    );
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.ARTICLE,
        technicalRelevant: null,
        technicalRelevanceEvaluatedAt: null,
        contentKind: null,
        contentKindEvaluatedAt: null,
        ...freshness,
      }),
      false,
    );
  });

  it("applies the centralized ContentKind source policy", () => {
    const base = { contentType: ContentType.ARTICLE, technicalRelevant: true, technicalRelevanceEvaluatedAt: evaluatedAt, contentKindEvaluatedAt: evaluatedAt, ...freshness };
    for (const contentKind of ["TECHNICAL_ARTICLE", "TECHNICAL_NEWS", "OFFICIAL_TECHNICAL", "RESEARCH", "REPOSITORY", "DISCUSSION"] as const) {
      assert.equal(isEligibleForTopicDiscovery({ ...base, contentKind }), true, contentKind);
    }
    for (const contentKind of ["PRODUCT_PAGE", "OTHER"] as const) {
      assert.equal(isEligibleForTopicDiscovery({ ...base, contentKind }), false, contentKind);
    }
  });

  it("excludes a stale ContentKind result until newer enriched metadata is classified", () => {
    assert.equal(isEligibleForTopicDiscovery({
      contentType: ContentType.ARTICLE, technicalRelevant: true, technicalRelevanceEvaluatedAt: evaluatedAt,
      contentKind: "TECHNICAL_ARTICLE", contentKindEvaluatedAt: evaluatedAt,
      metadataEnrichmentStatus: "ENRICHED", metadataEnrichmentAttemptedAt: new Date("2026-08-07T13:00:00Z"),
    }), false);
  });
});
