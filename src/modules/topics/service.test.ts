import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiExecutionResult } from "@/lib/ai";
import type { TopicDiscoveryConfig } from "./config";
import { createDiscoverySignature, type TopicDiscoveryRepository } from "./repository";
import { discoverTopics } from "./service";
import type { DiscoveredTopic, PersistedDiscoveredTopic, TopicDiscoveryCandidate } from "./types";

const config: TopicDiscoveryConfig = {
  lookbackDays: 7,
  maxItems: 2,
  maxTopics: 10,
  interests: ["React", "distributed systems"],
};

function candidate(id: string): TopicDiscoveryCandidate {
  return {
    id,
    title: `Technical item ${id}`,
    url: `https://example.com/${id}`,
    source: "test",
    summary: null,
    publishedAt: new Date("2026-08-07T00:00:00Z"),
    technicalCategory: "SOFTWARE_ENGINEERING",
    technicalRelevanceScore: 9,
    contentKind: "TECHNICAL_ARTICLE",
    sourceStrength: "STRONG",
  };
}

function discovered(sourceItemIds = ["one", "two"]): DiscoveredTopic {
  return {
    title: "A grouped engineering topic",
    description: "A useful technical development.",
    overallScore: 8.8,
    profileRelevanceScore: 9,
    technicalDepthScore: 8,
    freshnessScore: 9,
    contentPotentialScore: 9,
    rankingReason: "Current, technical, and practically useful.",
    sourceItemIds,
  };
}

function aiResult(topic: DiscoveredTopic): AiExecutionResult {
  return {
    outputText: JSON.stringify({ topics: [topic] }),
    usage: {
      feature: "topic-discovery", model: "gpt-5.4-nano", inputTokens: 200,
      outputTokens: 100, totalTokens: 300, requestedAt: new Date(), durationMs: 10,
      status: "SUCCESS", estimatedCostUsd: 0.000165,
    },
  };
}

describe("discoverTopics", () => {
  it("bounds candidates, uses the profile and model, and persists SourceItem relationships", async () => {
    let requestedLimit = 0;
    let persisted: DiscoveredTopic[] = [];
    const repository: TopicDiscoveryRepository = {
      async findCandidates(options) {
        requestedLimit = options.limit;
        return [candidate("one"), candidate("two")];
      },
      async persistTopics(topics) {
        persisted = topics;
        return topics.map((topic, index) => ({
          ...topic, id: `topic-${index}`, discoverySignature: createDiscoverySignature(topic.sourceItemIds),
        }));
      },
    };
    const summary = await discoverTopics({ limit: 50 }, {
      repository,
      config,
      now: () => new Date("2026-08-08T00:00:00Z"),
      executeAi: async (request) => {
        assert.equal(request.model, "gpt-5.4-nano");
        assert.equal(request.maxOutputTokens, 3_000);
        assert.match(request.input, /distributed systems/);
        assert.ok(request.structuredOutput);
        return aiResult(discovered());
      },
    });
    assert.equal(requestedLimit, 2);
    assert.deepEqual(persisted[0].sourceItemIds, ["one", "two"]);
    assert.equal(summary.topics[0].overallScore, 8.8);
    assert.equal(summary.aiRequests, 1);
  });

  it("does not make an AI request when no candidates are eligible", async () => {
    const repository: TopicDiscoveryRepository = {
      async findCandidates() { return []; },
      async persistTopics() { throw new Error("should not persist"); },
    };
    const summary = await discoverTopics({}, {
      repository, config,
      executeAi: async () => { throw new Error("should not call AI"); },
    });
    assert.deepEqual({ candidates: summary.candidates, aiRequests: summary.aiRequests }, { candidates: 0, aiRequests: 0 });
  });

  it("uses a stable support signature so repeated runs do not create exact duplicates", async () => {
    const stored = new Map<string, PersistedDiscoveredTopic>();
    const repository: TopicDiscoveryRepository = {
      async findCandidates() { return [candidate("one"), candidate("two")]; },
      async persistTopics(topics) {
        return topics.map((topic) => {
          const signature = createDiscoverySignature(topic.sourceItemIds);
          const value = { ...topic, id: stored.get(signature)?.id ?? `topic-${stored.size + 1}`, discoverySignature: signature };
          stored.set(signature, value);
          return value;
        });
      },
    };
    const dependencies = { repository, config, executeAi: async () => aiResult(discovered(["two", "one"])) };
    const first = await discoverTopics({}, dependencies);
    const second = await discoverTopics({}, dependencies);
    assert.equal(stored.size, 1);
    assert.equal(first.topics[0].id, second.topics[0].id);
  });
});
