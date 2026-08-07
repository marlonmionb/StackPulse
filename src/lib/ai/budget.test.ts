import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AiBudgetExhaustedError } from "./errors";
import {
  assertMonthlyBudgetAvailable,
  getMonthlyBudgetStatus,
  type MonthlyUsageReader,
} from "./budget";

describe("monthly AI budget", () => {
  it("queries the current UTC calendar month and calculates remaining budget", async () => {
    let receivedStart: Date | undefined;
    let receivedEnd: Date | undefined;
    const reader: MonthlyUsageReader = {
      async getSpendUsdBetween(start, end) {
        receivedStart = start;
        receivedEnd = end;
        return 1.25;
      },
    };

    const result = await getMonthlyBudgetStatus(
      reader,
      5,
      new Date("2026-08-31T23:30:00.000Z"),
    );

    assert.equal(receivedStart?.toISOString(), "2026-08-01T00:00:00.000Z");
    assert.equal(receivedEnd?.toISOString(), "2026-09-01T00:00:00.000Z");
    assert.equal(result.allowed, true);
    assert.equal(result.remainingUsd, 3.75);
  });

  it("rejects requests when spending equals the configured budget", async () => {
    const reader: MonthlyUsageReader = {
      async getSpendUsdBetween() {
        return 5;
      },
    };

    await assert.rejects(
      assertMonthlyBudgetAvailable(reader, 5),
      AiBudgetExhaustedError,
    );
  });
});
