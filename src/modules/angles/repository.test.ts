import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyExclusiveAngleSelection, supportingSourceConnections } from "./repository";
import type { AngleResearch, ValidatedContentAngle } from "./types";

const research: AngleResearch = {
  id: "research-1", topic: { id: "topic-1", title: "Topic", description: null }, summary: "Summary", whyItMatters: "Why",
  keyFindings: [{ text: "Finding", sourceIds: ["s1"] }], technicalDetails: [], tradeoffs: [], practicalImplications: [],
  openQuestions: [], limitations: [], angleCount: 0,
  sources: [
    { id: "s1", databaseId: "source-row-1", title: "One", publisher: null, domain: "one.example", type: "PRIMARY" },
    { id: "s2", databaseId: "source-row-2", title: "Two", publisher: null, domain: "two.example", type: "SECONDARY" },
  ],
};
const angle: ValidatedContentAngle = {
  title: "Angle", thesis: "Thesis", authorConnectionType: "TECHNICAL_ONLY", whyItFitsAuthor: "Fit",
  supportingSourceIds: ["s2", "s1"], fitScore: 8, requiresHumanInput: false, humanInputPrompt: null,
  claimBoundaryNotes: "Boundary",
};

describe("ContentAngle persistence helpers", () => {
  it("links stable evidence IDs to the existing TopicResearchSource rows", () => {
    assert.deepEqual(supportingSourceConnections(angle, research), [
      { researchSourceId: "source-row-2" }, { researchSourceId: "source-row-1" },
    ]);
    assert.throws(() => supportingSourceConnections({ ...angle, supportingSourceIds: ["s9"] }, research), /Unknown TopicResearchSource/);
  });

  it("clears only the selected angle in the same research before selecting the explicit ID", async () => {
    const rows = [
      { id: "a1", researchId: "research-1", status: "SELECTED" },
      { id: "a2", researchId: "research-1", status: "GENERATED" },
      { id: "b1", researchId: "research-2", status: "SELECTED" },
    ];
    const events: string[] = [];
    await applyExclusiveAngleSelection("research-1", "a2", {
      async clearSelected(researchId) {
        events.push("clear");
        rows.filter((row) => row.researchId === researchId && row.status === "SELECTED").forEach((row) => { row.status = "GENERATED"; });
      },
      async markSelected(id) {
        events.push("select"); const row = rows.find((candidate) => candidate.id === id)!; row.status = "SELECTED"; return row;
      },
    });
    assert.deepEqual(events, ["clear", "select"]);
    assert.deepEqual(rows.map((row) => row.status), ["GENERATED", "SELECTED", "SELECTED"]);
    assert.equal(rows.filter((row) => row.researchId === "research-1" && row.status === "SELECTED").length, 1);
  });
});
