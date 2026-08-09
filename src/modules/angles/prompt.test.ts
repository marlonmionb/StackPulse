import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAngleGenerationPrompt } from "./prompt";
import type { AngleResearch } from "./types";

const research: AngleResearch = {
  id: "research-1", topic: { id: "topic-1", title: "Atomic transitions", description: "A bounded topic" },
  summary: "Maintainer-reported behavior.", whyItMatters: "Trade-offs matter.",
  keyFindings: [{ text: "Finding", sourceIds: ["s1"] }], technicalDetails: [], tradeoffs: [], practicalImplications: [],
  openQuestions: [], limitations: ["Evidence is preliminary."], angleCount: 0,
  sources: [{ id: "s1", databaseId: "db-source-1", title: "Project repository", publisher: "Project", domain: "example.com", type: "PRIMARY" }],
};

describe("Angle Generation prompt", () => {
  const prompt = buildAngleGenerationPrompt(research, "## Verified Professional Experience\nReact only.", 4);
  it("separates technical evidence from author context and preserves evidence limitations", () => {
    assert.match(prompt, /Technical factual truth comes only from the TopicResearch/);
    assert.match(prompt, /Personal-experience truth comes only from the verified Author Profile/);
    assert.match(prompt, /not technical evidence/);
    assert.match(prompt, /one benchmark is not a universal conclusion/i);
    assert.match(prompt, /one vendor claim is not an established fact/i);
    assert.match(prompt, /Evidence is preliminary/);
  });
  it("enforces professional, project, learning, and technical-only authorship boundaries", () => {
    assert.match(prompt, /only experience explicitly documented under Verified Professional Experience/);
    assert.match(prompt, /always framed as project rather than professional production experience/);
    assert.match(prompt, /never imply production expertise/);
    assert.match(prompt.replace(/\n/g, " "), /TECHNICAL_ONLY.*fully valid and desirable/);
    assert.match(prompt, /Personal anecdotes are optional/);
    assert.match(prompt, /Never invent that the author used a researched technology professionally/);
  });
  it("requires diversity and forbids drafting, hooks, and Web Search", () => {
    assert.match(prompt, /substantively distinct, not paraphrases/);
    assert.match(prompt, /Do not search, fetch, or request more research/);
    assert.match(prompt, /Do not generate a LinkedIn post, hook/);
    assert.match(prompt, /Do not automatically select/);
  });
});
