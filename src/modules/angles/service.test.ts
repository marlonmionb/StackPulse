import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiExecutionResult, ExecuteAiRequest } from "@/lib/ai";
import type { AuthorProfileContext } from "@/modules/author-profile";
import type { AngleRepository } from "./repository";
import { generateAngles, hashAuthorProfile, selectAngle } from "./service";
import type { AngleResearch, SelectedContentAngle, ValidatedContentAngle } from "./types";

const now = new Date("2026-08-09T20:00:00Z");
const profile: AuthorProfileContext = { content: "# Author Profile\n\nverified-profile-secret", sourcePath: "docs/author-profile.md", characterCount: 42 };
function research(overrides: Partial<AngleResearch> = {}): AngleResearch {
  return {
    id: "research-1", topic: { id: "topic-1", title: "Atomic transitions", description: "Description" },
    summary: "Summary", whyItMatters: "Why", keyFindings: [{ text: "Finding", sourceIds: ["s1"] }],
    technicalDetails: [{ text: "Detail", sourceIds: ["s1"] }], tradeoffs: [], practicalImplications: [],
    openQuestions: [], limitations: [], angleCount: 0,
    sources: [{ id: "s1", databaseId: "source-db-1", title: "Official source", publisher: "Example", domain: "example.com", type: "PRIMARY" }],
    ...overrides,
  };
}
function candidates(): ValidatedContentAngle[] {
  return [1, 2, 3, 4].map((index) => ({
    title: `Angle ${index}`, thesis: `Distinct thesis ${index}`, authorConnectionType: index === 1 ? "TECHNICAL_ONLY" : "PROFESSIONAL_EXPERIENCE",
    whyItFitsAuthor: "Credible fit", supportingSourceIds: ["s1"], fitScore: 9 - index,
    requiresHumanInput: false, humanInputPrompt: null, claimBoundaryNotes: "Preserve limitations.",
  }));
}
function aiResult(): AiExecutionResult {
  return { outputText: JSON.stringify({ angles: candidates() }), webSearchSources: [], usage: {
    feature: "angle-generation", model: "gpt-5.6-terra", inputTokens: 100, outputTokens: 50, reasoningTokens: 5,
    webSearchCalls: 0, totalTokens: 150, requestedAt: now, durationMs: 20, status: "SUCCESS",
    estimatedTokenCostUsd: 0.001, estimatedToolCostUsd: 0, estimatedCostUsd: 0.001,
  } };
}
function repository(value: AngleResearch | null) {
  const persistInputs: Parameters<AngleRepository["persistGeneration"]>[0][] = [];
  const repo: AngleRepository = {
    async findResearch(id) { assert.equal(id, value?.id ?? id); return value; },
    async persistGeneration(input) {
      persistInputs.push(input);
      return input.angles.map((angle, index) => ({ ...angle, id: `angle-${index + 1}`, topicResearchId: input.research.id,
        generationId: input.generationId, authorProfileHash: input.authorProfileHash, status: "GENERATED", model: input.model, generatedAt: input.generatedAt }));
    },
    async list() { return []; },
    async select() { return null; },
  };
  return { repo, persistInputs };
}

describe("generateAngles", () => {
  it("fails missing, nonexistent, incomplete research, and invalid profile before AI", async () => {
    let calls = 0; const executeAi = async () => { calls++; throw new Error("must not run"); };
    await assert.rejects(generateAngles("", {}, { executeAi }), /research-id/);
    await assert.rejects(generateAngles("research-1", {}, { repository: repository(null).repo, executeAi }), /not found/);
    await assert.rejects(generateAngles("research-1", {}, { repository: repository(research({ sources: [] })).repo, executeAi }), /no evidence sources/);
    await assert.rejects(generateAngles("research-1", {}, { repository: repository(research()).repo, executeAi, loadProfile: async () => { throw new Error("invalid profile"); } }), /invalid profile/);
    assert.equal(calls, 0);
  });
  it("uses only the requested research and validated profile in one no-search request", async () => {
    const state = repository(research()); const requests: ExecuteAiRequest[] = [];
    const result = await generateAngles("research-1", {}, { repository: state.repo, loadProfile: async () => profile,
      executeAi: async (request) => { requests.push(request); return aiResult(); },
      config: { model: "gpt-5.6-terra", maxOutputTokens: 2_500, count: 4 }, now: () => now, generationId: () => "generation-1" });
    assert.equal(requests.length, 1); assert.equal(requests[0].webSearch, undefined);
    assert.equal(requests[0].reasoningEffort, "medium"); assert.equal(requests[0].model, "gpt-5.6-terra");
    assert.match(requests[0].input, /research-1/); assert.match(requests[0].input, /verified-profile-secret/);
    assert.doesNotMatch(requests[0].input, /SourceItem/); assert.equal(result.angles.length, 4);
    assert.ok(result.angles.every((angle) => angle.topicResearchId === "research-1" && angle.generationId === "generation-1"));
    assert.equal(state.persistInputs.length, 1); assert.equal(state.persistInputs[0].angles.length, 4);
    assert.equal(JSON.stringify(state.persistInputs[0]).includes("verified-profile-secret"), false);
    assert.equal(state.persistInputs[0].authorProfileHash, hashAuthorProfile(profile.content));
  });
  it("skips existing angles with zero profile loads and zero AI, while force appends", async () => {
    let profileLoads = 0; let aiCalls = 0;
    const current = research({ angleCount: 4 }); const state = repository(current);
    const deps = { repository: state.repo, loadProfile: async () => { profileLoads++; return profile; }, executeAi: async () => { aiCalls++; return aiResult(); },
      config: { model: "gpt-5.6-terra", maxOutputTokens: 2_500, count: 4 }, generationId: () => "generation-2" };
    const skipped = await generateAngles("research-1", {}, deps);
    assert.equal(skipped.skipped, true); assert.equal(profileLoads, 0); assert.equal(aiCalls, 0);
    const forced = await generateAngles("research-1", { force: true }, deps);
    assert.equal(forced.skipped, false); assert.equal(profileLoads, 1); assert.equal(aiCalls, 1);
    assert.equal(state.persistInputs[0].generationId, "generation-2");
  });
  it("persists nothing when provider output validation fails", async () => {
    const state = repository(research()); const invalid = aiResult(); invalid.outputText = JSON.stringify({ angles: candidates().slice(0, 3) });
    await assert.rejects(generateAngles("research-1", {}, { repository: state.repo, loadProfile: async () => profile,
      executeAi: async () => invalid, config: { model: "gpt-5.6-terra", maxOutputTokens: 2_500, count: 4 } }), /exactly 4/);
    assert.equal(state.persistInputs.length, 0);
  });
  it("rejects unexpected Web Search usage", async () => {
    const state = repository(research()); const unexpected = aiResult(); unexpected.usage.webSearchCalls = 1;
    await assert.rejects(generateAngles("research-1", {}, { repository: state.repo, loadProfile: async () => profile,
      executeAi: async () => unexpected, config: { model: "gpt-5.6-terra", maxOutputTokens: 2_500, count: 4 } }), /unexpectedly returned Web Search/);
    assert.equal(state.persistInputs.length, 0);
  });
});

describe("profile hash and human selection", () => {
  it("hashes profile content deterministically and sensitively", () => {
    assert.equal(hashAuthorProfile(profile.content), hashAuthorProfile(profile.content));
    assert.notEqual(hashAuthorProfile(profile.content), hashAuthorProfile(`${profile.content}.`));
    assert.match(hashAuthorProfile(profile.content), /^[a-f0-9]{64}$/);
  });
  it("requires an explicit angle ID and delegates selection without any AI boundary", async () => {
    await assert.rejects(selectAngle("", repository(research()).repo), /angle-id/);
    const base = candidates()[0];
    const selected: SelectedContentAngle = { ...base, id: "angle-1", topicResearchId: "research-1", generationId: "generation-1",
      authorProfileHash: "a".repeat(64), status: "SELECTED", model: "gpt-5.6-terra", generatedAt: now, researchTitle: "Atomic transitions" };
    let selectedId = "";
    const repo = repository(research()).repo; repo.select = async (id) => { selectedId = id; return selected; };
    assert.equal((await selectAngle("angle-1", repo)).status, "SELECTED"); assert.equal(selectedId, "angle-1");
    repo.select = async () => null; await assert.rejects(selectAngle("missing", repo), /not found/);
  });
});
