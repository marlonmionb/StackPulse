import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { contentKindOutputFormat } from "./structured-output";

describe("ContentKind Structured Output schema", () => {
  it("constrains opaque IDs to exact supplied values", () => {
    const format = contentKindOutputFormat(["cuid-one", "cuid-two"]);
    const classifications = format.schema.properties.classifications;
    assert.deepEqual(classifications.required, ["cuid-one", "cuid-two"]);
    assert.deepEqual(Object.keys(classifications.properties), ["cuid-one", "cuid-two"]);
    assert.equal(classifications.additionalProperties, false);
  });
});
