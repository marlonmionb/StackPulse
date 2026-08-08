import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentType } from "../ingestion/content-type";
import { isEligibleForTopicDiscovery } from "./candidate-selection";

describe("isEligibleForTopicDiscovery", () => {
  const evaluatedAt = new Date("2026-08-07T12:00:00Z");

  it("requires a relevant AI evaluation and excludes videos", () => {
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.VIDEO,
        technicalRelevant: true,
        technicalRelevanceEvaluatedAt: evaluatedAt,
      }),
      false,
    );
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.ARTICLE,
        technicalRelevant: true,
        technicalRelevanceEvaluatedAt: evaluatedAt,
      }),
      true,
    );
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.ARTICLE,
        technicalRelevant: false,
        technicalRelevanceEvaluatedAt: evaluatedAt,
      }),
      false,
    );
    assert.equal(
      isEligibleForTopicDiscovery({
        contentType: ContentType.ARTICLE,
        technicalRelevant: null,
        technicalRelevanceEvaluatedAt: null,
      }),
      false,
    );
  });
});
