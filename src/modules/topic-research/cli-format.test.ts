import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatKeyFinding } from "./cli-format";

describe("Topic Research CLI formatting", () => {
  it("prints a finding's citations exactly once", () => {
    const output = formatKeyFinding({
      text: "Interlock uses Read Committed while PostgreSQL defines its snapshot semantics. [s1, s3]",
      confidence: "MEDIUM",
      sourceIds: ["s1", "s3"],
    });
    assert.equal(output, "- [MEDIUM] Interlock uses Read Committed while PostgreSQL defines its snapshot semantics. [s1, s3]");
    assert.doesNotMatch(output, /\[s1, s3\] \(s1, s3\)/);
    assert.equal(output.match(/s1, s3/g)?.length, 1);
  });
});
