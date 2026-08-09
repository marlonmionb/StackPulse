import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAngleGenerationConfig } from "./config";

describe("getAngleGenerationConfig", () => {
  it("uses the feature model and conservative defaults", () => {
    assert.deepEqual(getAngleGenerationConfig({}), { model: "gpt-5.6-terra", maxOutputTokens: 2_500, count: 4 });
  });
  it("accepts only three to five angles and bounded output", () => {
    assert.throws(() => getAngleGenerationConfig({ ANGLE_GENERATION_COUNT: "2" }), /3 to 5/);
    assert.throws(() => getAngleGenerationConfig({ ANGLE_GENERATION_COUNT: "6" }), /3 to 5/);
    assert.throws(() => getAngleGenerationConfig({ ANGLE_GENERATION_MAX_OUTPUT_TOKENS: "5001" }), /1 to 5000/);
  });
});
