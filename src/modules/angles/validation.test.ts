import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAndValidateAngleOutput } from "./validation";

function angle(index: number) {
  return {
    title: `Angle ${index}`, thesis: `Distinct technical thesis ${index}.`,
    authorConnectionType: index === 1 ? "TECHNICAL_ONLY" : "PROFESSIONAL_EXPERIENCE",
    whyItFitsAuthor: "A credible fit grounded at the documented level.", supportingSourceIds: ["s1"],
    fitScore: 8, requiresHumanInput: false, humanInputPrompt: null as string | null,
    claimBoundaryNotes: "Do not imply an undocumented production implementation.",
  };
}
function output(mutator?: (angles: ReturnType<typeof angle>[]) => void): string {
  const angles = [1, 2, 3, 4].map(angle); mutator?.(angles); return JSON.stringify({ angles });
}

describe("Angle Generation structured validation", () => {
  it("requires the exact count and validates the controlled connection and score", () => {
    assert.throws(() => parseAndValidateAngleOutput(JSON.stringify({ angles: [angle(1)] }), ["s1"], 4), /exactly 4/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].authorConnectionType = "INVENTED"; }), ["s1"], 4), /Invalid author connection/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].fitScore = 11; }), ["s1"], 4), /0 to 10/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].fitScore = 7.5; }), ["s1"], 4), /integer/);
  });
  it("rejects unknown, missing, and duplicate evidence IDs", () => {
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].supportingSourceIds = ["s9"]; }), ["s1"], 4), /unknown research source ID/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].supportingSourceIds = []; }), ["s1"], 4), /requires supporting evidence/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].supportingSourceIds = ["s1", "s1"]; }), ["s1"], 4), /duplicate research source IDs/);
  });
  it("rejects duplicate titles and theses after deterministic normalization", () => {
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[1].title = " ANGLE--1 "; }), ["s1"], 4), /Duplicate angle titles/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[1].thesis = "Distinct technical thesis 1!"; }), ["s1"], 4), /Duplicate angle theses/);
  });
  it("enforces human-input consistency and bounded text", () => {
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].humanInputPrompt = "Unexpected"; }), ["s1"], 4), /must be null/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].requiresHumanInput = true; }), ["s1"], 4), /humanInputPrompt/);
    assert.throws(() => parseAndValidateAngleOutput(output((angles) => { angles[0].title = "x".repeat(101); }), ["s1"], 4), /at most 100/);
    const parsed = parseAndValidateAngleOutput(output((angles) => { angles[0].requiresHumanInput = true; angles[0].humanInputPrompt = "Have you encountered this trade-off?"; }), ["s1"], 4);
    assert.equal(parsed[0].humanInputPrompt, "Have you encountered this trade-off?");
  });
});
