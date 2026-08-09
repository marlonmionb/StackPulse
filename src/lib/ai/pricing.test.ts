import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { UnsupportedModelPricingError } from "./errors";
import { calculateEstimatedCostUsd, calculateWebSearchCostUsd } from "./pricing";

describe("calculateEstimatedCostUsd", () => {
  it("calculates input and output cost from actual token usage", () => {
    assert.equal(calculateEstimatedCostUsd("gpt-4o-mini", 1_000_000, 500_000), 0.45);
  });

  it("calculates gpt-5.4-nano cost from its local price", () => {
    assert.equal(calculateEstimatedCostUsd("gpt-5.4-nano", 1_000_000, 1_000_000), 1.45);
  });

  it("calculates Topic Research token and Web Search tool costs centrally", () => {
    assert.equal(calculateEstimatedCostUsd("gpt-5.6-terra", 1_000_000, 1_000_000), 17.5);
    assert.equal(calculateWebSearchCostUsd(4), 0.04);
  });

  it("fails explicitly when local pricing is unknown", () => {
    assert.throws(
      () => calculateEstimatedCostUsd("unknown-model", 100, 50),
      UnsupportedModelPricingError,
    );
  });
});
