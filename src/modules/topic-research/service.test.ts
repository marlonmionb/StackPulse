import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiExecutionResult, ExecuteAiRequest } from "@/lib/ai";
import type { TopicResearchRepository } from "./repository";
import { researchTopic } from "./service";
import type { TopicForResearch, ValidatedResearchReport } from "./types";

const now = new Date("2026-08-09T12:00:00Z");
const config = { model: "gpt-5.6-terra", maxOutputTokens: 4_000, maxWebSearchCalls: 4 };
function topic(overrides: Partial<TopicForResearch> = {}): TopicForResearch {
  return { id: "topic-1", title: "Interlock", description: "Distributed locking", rankingReason: "Useful", score: 9,
    profileRelevanceScore: 9, technicalDepthScore: 9, freshnessScore: 8, contentPotentialScore: 9, status: "DISCOVERED", researchCount: 0,
    sourceItems: [{ id: "item-1", title: "Interlock", url: "https://github.com/jajego/interlock", canonicalUrl: null, source: "rss", summary: "Seed details", publishedAt: now,
      contentKind: "REPOSITORY", technicalCategory: "DATABASE", contentType: "ARTICLE", technicalRelevant: true,
      technicalRelevanceEvaluatedAt: now, contentKindEvaluatedAt: now, metadataEnrichmentStatus: "PENDING", metadataEnrichmentAttemptedAt: null }], ...overrides };
}
const evidenceOutput = { researchNarrative: "Repository details. A model-only link https://github.com/jajego/interlock/blob/main/benchmark.md is not evidence." };
const synthesisOutput = { summary: "Summary", whyItMatters: "Important", keyFindings: [{ finding: "Finding", sourceIds: ["s1"], confidence: "HIGH" }],
  technicalDetails: [{ detail: "Detail", sourceIds: ["s1"] }], tradeoffs: [{ point: "Tradeoff", sourceIds: ["s1"] }],
  practicalImplications: [{ implication: "Implication", sourceIds: ["s1"] }], openQuestions: [], limitations: [],
  sourceAssessments: [{ sourceId: "s1", type: "PRIMARY" }] };

function aiResult(output: unknown, options: { webSearchCalls: number; feature: string; webSearchSources?: AiExecutionResult["webSearchSources"] }): AiExecutionResult {
  const toolCost = options.webSearchCalls * 0.01;
  return { outputText: JSON.stringify(output), webSearchSources: options.webSearchSources ?? [], usage: {
    feature: options.feature, model: "gpt-5.6-terra", inputTokens: 100, outputTokens: 50, reasoningTokens: 10,
    webSearchCalls: options.webSearchCalls, totalTokens: 150, requestedAt: now, durationMs: 10, status: "SUCCESS",
    estimatedTokenCostUsd: 0.001, estimatedToolCostUsd: toolCost, estimatedCostUsd: 0.001 + toolCost,
  } };
}
function executor(requests: ExecuteAiRequest[], synthesis = synthesisOutput) {
  return async (request: ExecuteAiRequest) => {
    requests.push(request);
    if (requests.length % 2 === 1) return aiResult(evidenceOutput, { feature: "topic-research-evidence", webSearchCalls: 2, webSearchSources: [
      { url: "https://github.com/jajego/interlock", title: null },
      { url: "https://github.com/jajego/interlock/", title: "Interlock repository" },
    ] });
    return aiResult(synthesis, { feature: "topic-research-synthesis", webSearchCalls: 0 });
  };
}
function repository(value: TopicForResearch | null) {
  const events: string[] = []; const reports: ValidatedResearchReport[] = [];
  const repo: TopicResearchRepository = { async findTopic() { return value; }, async markSelected() { events.push("selected"); }, async persist(_id, report) { events.push("persisted"); reports.push(report); return `research-${reports.length}`; } };
  return { repo, events, reports };
}

describe("researchTopic", () => {
  it("fails missing, unknown, and stale selections before AI", async () => {
    let calls = 0; const executeAi = async () => { calls++; throw new Error("must not run"); };
    await assert.rejects(researchTopic("", {}, { executeAi }), /topic-id/);
    await assert.rejects(researchTopic("missing", {}, { repository: repository(null).repo, executeAi }), /not found/);
    await assert.rejects(researchTopic("topic-1", {}, { repository: repository(topic({ sourceItems: [{ ...topic().sourceItems[0], contentKind: "PRODUCT_PAGE" }] })).repo, executeAi }), /cannot be researched/);
    assert.equal(calls, 0);
  });
  it("skips existing research without AI and force creates a new report while preserving RESEARCHED", async () => {
    const requests: ExecuteAiRequest[] = []; const current = topic({ status: "RESEARCHED", researchCount: 1 }); const state = repository(current);
    const skipped = await researchTopic("topic-1", {}, { repository: state.repo, executeAi: executor(requests) });
    assert.equal(skipped.skipped, true); assert.equal(requests.length, 0);
    const forced = await researchTopic("topic-1", { force: true }, { repository: state.repo, executeAi: executor(requests), config });
    assert.equal(forced.researchId, "research-1"); assert.equal(requests.length, 2); assert.deepEqual(state.events, ["selected", "persisted"]);
  });
  it("deduplicates seed and Web Search evidence before synthesis, citations, and persistence", async () => {
    const requests: ExecuteAiRequest[] = []; const state = repository(topic());
    const result = await researchTopic("topic-1", {}, { repository: state.repo, config, now: () => now, executeAi: executor(requests) });
    assert.equal(requests.length, 2);
    assert.equal(requests[0].webSearch?.maxCalls, 4); assert.equal(requests[1].webSearch, undefined);
    assert.match(requests[1].input, /"id":"s1"/); assert.doesNotMatch(requests[1].input, /"id":"s2"/);
    assert.doesNotMatch(requests[1].input, /"canonicalUrl":"https:\/\/github\.com\/jajego\/interlock\/blob\/main\/benchmark\.md"/);
    assert.match(requests[1].input, /model-only link/);
    assert.match(JSON.stringify(requests[1].structuredOutput?.schema), /"enum":\["s1"\]/);
    assert.equal(state.reports[0].sources.length, 1); assert.equal(state.reports[0].sources[0].id, "s1");
    assert.deepEqual(state.reports[0].keyFindings[0].sourceIds, ["s1"]);
    assert.equal(result.usage?.webSearchCalls, 2); assert.ok(Math.abs((result.usage?.estimatedCostUsd ?? 0) - 0.022) < 1e-12);
    assert.deepEqual(state.events, ["selected", "persisted"]);
  });
  it("does not persist when evidence collection or synthesis fails", async () => {
    const collectionFailure = repository(topic());
    await assert.rejects(researchTopic("topic-1", {}, { repository: collectionFailure.repo, config, executeAi: async () => { throw new Error("web search failed"); } }), /web search failed/);
    assert.deepEqual(collectionFailure.events, ["selected"]);

    const synthesisFailure = repository(topic()); const requests: ExecuteAiRequest[] = [];
    const invalid = { ...synthesisOutput, keyFindings: [{ finding: "Finding", sourceIds: ["https://github.com/jajego/interlock"], confidence: "HIGH" }] };
    await assert.rejects(researchTopic("topic-1", {}, { repository: synthesisFailure.repo, config, executeAi: executor(requests, invalid) }), /dangling/);
    assert.deepEqual(synthesisFailure.events, ["selected"]); assert.equal(synthesisFailure.reports.length, 0);
  });
});
