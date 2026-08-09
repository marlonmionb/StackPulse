import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiExecutionResult, ExecuteAiRequest } from "@/lib/ai";
import type { TopicResearchRepository } from "./repository";
import { researchTopic } from "./service";
import type { TopicForResearch, ValidatedResearchReport } from "./types";

const now = new Date("2026-08-09T12:00:00Z");
function topic(overrides: Partial<TopicForResearch> = {}): TopicForResearch {
  return { id: "topic-1", title: "Atomic state transitions", description: "PostgreSQL state transitions", rankingReason: "Useful", score: 9,
    profileRelevanceScore: 9, technicalDepthScore: 9, freshnessScore: 8, contentPotentialScore: 9, status: "DISCOVERED", researchCount: 0,
    sourceItems: [{ id: "item-1", title: "Spec", url: "https://example.com/spec", canonicalUrl: null, source: "rss", summary: "Details", publishedAt: now,
      contentKind: "OFFICIAL_TECHNICAL", technicalCategory: "DATABASE", contentType: "ARTICLE", technicalRelevant: true,
      technicalRelevanceEvaluatedAt: now, contentKindEvaluatedAt: now, metadataEnrichmentStatus: "PENDING", metadataEnrichmentAttemptedAt: null }], ...overrides };
}
const output = { summary: "Summary", whyItMatters: "Important", keyFindings: [{ finding: "Finding", sourceIds: ["s1"], confidence: "HIGH" }],
  technicalDetails: [{ detail: "Detail", sourceIds: ["s1"] }], tradeoffs: [{ point: "Tradeoff", sourceIds: ["s1"] }],
  practicalImplications: [{ implication: "Implication", sourceIds: ["s1"] }], openQuestions: [], limitations: [],
  sources: [{ id: "s1", title: "Spec", url: "https://example.com/spec", publisher: "Example", publishedAt: null, type: "PRIMARY" }] };
function ai(): AiExecutionResult { return { outputText: JSON.stringify(output), groundedUrls: ["https://example.com/spec"], usage: { feature: "topic-research", model: "gpt-5.6-terra", inputTokens: 100, outputTokens: 50, reasoningTokens: 10, webSearchCalls: 2, totalTokens: 150, requestedAt: now, durationMs: 10, status: "SUCCESS", estimatedTokenCostUsd: .001, estimatedToolCostUsd: .02, estimatedCostUsd: .021 } }; }

function repository(value: TopicForResearch | null) {
  const events: string[] = []; const reports: ValidatedResearchReport[] = [];
  const repo: TopicResearchRepository = { async findTopic() { return value; }, async markSelected() { events.push("selected"); }, async persist(_id, report) { events.push("persisted"); reports.push(report); return `research-${reports.length}`; } };
  return { repo, events, reports };
}

describe("researchTopic", () => {
  it("fails missing, unknown, and stale selections before AI", async () => {
    let calls = 0; const executeAi = async () => { calls++; return ai(); };
    await assert.rejects(researchTopic("", {}, { executeAi }), /topic-id/);
    await assert.rejects(researchTopic("missing", {}, { repository: repository(null).repo, executeAi }), /not found/);
    await assert.rejects(researchTopic("topic-1", {}, { repository: repository(topic({ sourceItems: [{ ...topic().sourceItems[0], contentKind: "PRODUCT_PAGE" }] })).repo, executeAi }), /cannot be researched/);
    assert.equal(calls, 0);
  });
  it("skips existing research without AI and force creates a new report while preserving RESEARCHED", async () => {
    let calls = 0; const current = topic({ status: "RESEARCHED", researchCount: 1 }); const state = repository(current);
    const skipped = await researchTopic("topic-1", {}, { repository: state.repo, executeAi: async () => { calls++; return ai(); } });
    assert.equal(skipped.skipped, true); assert.equal(calls, 0);
    const forced = await researchTopic("topic-1", { force: true }, { repository: state.repo, executeAi: async () => { calls++; return ai(); }, config: { model: "gpt-5.6-terra", maxOutputTokens: 4000, maxWebSearchCalls: 4 } });
    assert.equal(forced.researchId, "research-1"); assert.equal(calls, 1); assert.deepEqual(state.events, ["selected", "persisted"]);
  });
  it("marks explicit selection, uses bounded Web Search, and persists only after validation", async () => {
    const state = repository(topic()); let request: ExecuteAiRequest | undefined;
    const result = await researchTopic("topic-1", {}, { repository: state.repo, config: { model: "gpt-5.6-terra", maxOutputTokens: 4000, maxWebSearchCalls: 4 }, now: () => now,
      executeAi: async (value) => { request = value; return ai(); } });
    assert.equal(request?.reasoningEffort, "medium"); assert.equal(request?.webSearch?.maxCalls, 4); assert.equal(result.researchId, "research-1");
    assert.deepEqual(state.events, ["selected", "persisted"]);
  });
  it("leaves a failed attempt selected and does not persist a completed report", async () => {
    const state = repository(topic());
    await assert.rejects(researchTopic("topic-1", {}, { repository: state.repo, config: { model: "gpt-5.6-terra", maxOutputTokens: 4000, maxWebSearchCalls: 4 }, executeAi: async () => { throw new Error("web search failed"); } }), /web search failed/);
    assert.deepEqual(state.events, ["selected"]); assert.equal(state.reports.length, 0);
  });
});
