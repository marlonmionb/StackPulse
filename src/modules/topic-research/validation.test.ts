import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ConsolidatedResearchEvidence } from "./types";
import { parseAndValidateTopicResearchOutput } from "./validation";

const evidence: ConsolidatedResearchEvidence[] = [{
  id: "s1", title: "Specification", url: "https://example.com/spec", canonicalUrl: "https://example.com/spec",
  publisher: "Example", domain: "example.com", publishedAt: null, type: "PRIMARY", evidence: "Defines the behavior.", origin: "WEB_SEARCH",
}];
function valid() {
  return {
    summary: "A grounded summary.", whyItMatters: "It affects implementation choices.",
    keyFindings: [{ finding: "The specification defines the behavior.", sourceIds: ["s1"], confidence: "HIGH" }],
    technicalDetails: [{ detail: "The protocol uses a bounded exchange.", sourceIds: ["s1"] }],
    tradeoffs: [{ point: "The guarantee adds coordination cost.", sourceIds: ["s1"] }],
    practicalImplications: [{ implication: "Implementations should validate state.", sourceIds: ["s1"] }],
    openQuestions: ["How do older clients behave?"], limitations: ["Only one primary source was available."],
  };
}
const parse = (value: unknown, sources = evidence) => parseAndValidateTopicResearchOutput(JSON.stringify(value), sources);

describe("Topic Research synthesis validation", () => {
  it("accepts only application-assigned evidence IDs and supplies the consolidated sources", () => {
    const report = parse(valid());
    assert.deepEqual(report.keyFindings[0].sourceIds, ["s1"]);
    assert.equal(report.sources[0].canonicalUrl, "https://example.com/spec");
  });
  it("rejects invalid confidence, missing evidence, dangling IDs, and raw URL IDs", () => {
    const confidence = valid(); confidence.keyFindings[0].confidence = "CERTAIN"; assert.throws(() => parse(confidence), /Invalid confidence/);
    const missing = valid(); missing.keyFindings[0].sourceIds = []; assert.throws(() => parse(missing), /requires evidence/);
    const dangling = valid(); dangling.keyFindings[0].sourceIds = ["missing"]; assert.throws(() => parse(dangling), /dangling/);
    const rawUrl = valid(); rawUrl.keyFindings[0].sourceIds = ["https://github.com/jajego/interlock"];
    assert.throws(() => parse(rawUrl), /dangling/);
  });
  it("rejects duplicate internal IDs and duplicate canonical evidence before synthesis validation", () => {
    assert.throws(() => parse(valid(), [...evidence, { ...evidence[0] }]), /Duplicate internal source id/);
    assert.throws(() => parse(valid(), [...evidence, { ...evidence[0], id: "s2" }]), /Duplicate canonical evidence URL/);
  });
  it("normalizes duplicate citation IDs consistently", () => {
    const output = valid();
    output.keyFindings[0].sourceIds = ["s1", "s1"];
    assert.deepEqual(parse(output).keyFindings[0].sourceIds, ["s1"]);
  });
});
