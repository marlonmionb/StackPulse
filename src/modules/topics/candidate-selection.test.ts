import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentType } from "../ingestion/content-type";
import { isEligibleForTopicDiscovery } from "./candidate-selection";

describe("isEligibleForTopicDiscovery", () => {
  it("excludes videos while preserving articles and unknown items", () => {
    assert.equal(
      isEligibleForTopicDiscovery({ contentType: ContentType.VIDEO }),
      false,
    );
    assert.equal(
      isEligibleForTopicDiscovery({ contentType: ContentType.ARTICLE }),
      true,
    );
    assert.equal(
      isEligibleForTopicDiscovery({ contentType: ContentType.UNKNOWN }),
      true,
    );
  });
});
