import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getTopicDiscoveryConfig } from "./config";

describe("getTopicDiscoveryConfig", () => {
  it("parses bounded settings and centralized interests", () => {
    const config = getTopicDiscoveryConfig({
      TOPIC_DISCOVERY_LOOKBACK_DAYS: "14",
      TOPIC_DISCOVERY_MAX_ITEMS: "25",
      TOPIC_DISCOVERY_MAX_TOPICS: "6",
      TOPIC_DISCOVERY_INTERESTS: " React, TypeScript,React, distributed systems ",
    });
    assert.deepEqual(config, {
      lookbackDays: 14,
      maxItems: 25,
      maxTopics: 6,
      interests: ["React", "TypeScript", "distributed systems"],
    });
  });

  it("rejects invalid bounds", () => {
    assert.throws(
      () => getTopicDiscoveryConfig({ TOPIC_DISCOVERY_MAX_ITEMS: "101" }),
      /1 to 100/,
    );
  });
});
