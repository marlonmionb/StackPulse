import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAndValidateContentKindOutput, ContentKindOutputError } from "./validation";

const classification = (sourceItemId: string, contentKind = "TECHNICAL_ARTICLE") => ({ sourceItemId, contentKind, confidence: "HIGH", reason: "Substantive technical editorial content." });
const output = (classifications: unknown[]) => JSON.stringify({ classifications });

describe("ContentKind Structured Output validation", () => {
  it("accepts the controlled classifications", () => {
    const result = parseAndValidateContentKindOutput(output([classification("article"), classification("official", "OFFICIAL_TECHNICAL"), classification("research", "RESEARCH"), classification("product", "PRODUCT_PAGE")]), ["article", "official", "research", "product"]);
    assert.deepEqual(result.map((item) => item.contentKind), ["TECHNICAL_ARTICLE", "OFFICIAL_TECHNICAL", "RESEARCH", "PRODUCT_PAGE"]);
  });

  it("rejects malformed JSON and invalid enum or reason values", () => {
    assert.throws(() => parseAndValidateContentKindOutput("nope", ["one"]), ContentKindOutputError);
    assert.throws(() => parseAndValidateContentKindOutput(output([classification("one", "BLOG")]), ["one"]), /invalid contentKind/);
    assert.throws(() => parseAndValidateContentKindOutput(output([{ ...classification("one"), reason: "" }]), ["one"]), /invalid reason/);
  });

  it("rejects unknown, duplicate, and missing IDs", () => {
    assert.throws(() => parseAndValidateContentKindOutput(output([classification("unknown")]), ["expected"]), /unknown SourceItem/);
    assert.throws(() => parseAndValidateContentKindOutput(output([classification("one"), classification("one")]), ["one", "two"]), /duplicate SourceItem/);
    assert.throws(() => parseAndValidateContentKindOutput(output([classification("one")]), ["one", "two"]), /omitted classifications.*two/);
  });
});
