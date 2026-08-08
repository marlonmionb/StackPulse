import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnsupportedModelPricingError } from "./errors";
import { calculateEstimatedCostUsd } from "./pricing";

describe("calculateEstimatedCostUsd", () => {
  it("calculates input and output cost from actual token usage", () => {
    assert.equal(calculateEstimatedCostUsd("gpt-4o-mini", 1_000_000, 500_000), 0.45);
  });

  it("calculates gpt-5.4-nano cost from its local price", () => {
    assert.equal(calculateEstimatedCostUsd("gpt-5.4-nano", 1_000_000, 1_000_000), 1.45);
  });

  it("fails explicitly when local pricing is unknown", () => {
    assert.throws(
      () => calculateEstimatedCostUsd("unknown-model", 100, 50),
      UnsupportedModelPricingError,
    );
  });
});
