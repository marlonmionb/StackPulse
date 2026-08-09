import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAndValidateTopicResearchOutput } from "./validation";

function valid() {
  return {
    summary: "A grounded summary.", whyItMatters: "It affects implementation choices.",
    keyFindings: [{ finding: "The specification defines the behavior.", sourceIds: ["s1"], confidence: "HIGH" }],
    technicalDetails: [{ detail: "The protocol uses a bounded exchange.", sourceIds: ["s1"] }],
    tradeoffs: [{ point: "The guarantee adds coordination cost.", sourceIds: ["s1"] }],
    practicalImplications: [{ implication: "Implementations should validate state.", sourceIds: ["s1"] }],
    openQuestions: ["How do older clients behave?"], limitations: ["Only one primary source was available."],
    sources: [{ id: "s1", title: "Specification", url: "https://example.com/spec", publisher: "Example", publishedAt: null, type: "PRIMARY" }],
  };
}
const parse = (value: unknown, grounded = ["https://example.com/spec"]) => parseAndValidateTopicResearchOutput(JSON.stringify(value), grounded);

describe("Topic Research output validation", () => {
  it("accepts grounded evidence and normalizes its URL", () => assert.equal(parse(valid()).sources[0].canonicalUrl, "https://example.com/spec"));
  it("rejects invalid confidence, missing evidence, dangling citations, malformed URLs, and hallucinated URLs", () => {
    const confidence = valid(); confidence.keyFindings[0].confidence = "CERTAIN"; assert.throws(() => parse(confidence), /Invalid confidence/);
    const missing = valid(); missing.keyFindings[0].sourceIds = []; assert.throws(() => parse(missing), /requires evidence/);
    const dangling = valid(); dangling.keyFindings[0].sourceIds = ["missing"]; assert.throws(() => parse(dangling), /dangling/);
    const malformed = valid(); malformed.sources[0].url = "not-a-url"; assert.throws(() => parse(malformed), /Invalid source URL/);
    assert.throws(() => parse(valid(), ["https://different.example/source"]), /not grounded/);
  });
  it("rejects duplicate source IDs and safely collapses duplicate canonical URLs with remapped citations", () => {
    const duplicateId = valid(); duplicateId.sources.push({ ...duplicateId.sources[0] }); assert.throws(() => parse(duplicateId), /Duplicate source id/);
    const duplicateUrl = valid(); duplicateUrl.sources.push({ ...duplicateUrl.sources[0], id: "s2", url: "https://example.com/spec/?utm_source=test" });
    duplicateUrl.keyFindings[0].sourceIds = ["s2"];
    const report = parse(duplicateUrl);
    assert.equal(report.sources.length, 1); assert.deepEqual(report.keyFindings[0].sourceIds, ["s1"]);
  });
});
