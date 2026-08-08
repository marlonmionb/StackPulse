import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiProvider } from "./client";
import { AiBudgetExhaustedError, AiProviderRequestError } from "./errors";
import { executeAiRequest } from "./execute";
import type { AiUsageRecord, AiUsageStore } from "./usage.repository";

const config = {
  apiKey: "test-key",
  defaultModel: "gpt-4o-mini",
  monthlyBudgetUsd: 5,
};

function createUsageStore(spentUsd = 0): {
  store: AiUsageStore;
  records: AiUsageRecord[];
} {
  const records: AiUsageRecord[] = [];

  return {
    records,
    store: {
      async create(record) {
        records.push(record);
      },
      async getSpendUsdBetween() {
        return spentUsd;
      },
    },
  };
}

describe("executeAiRequest", () => {
  it("maps provider usage, applies the per-request output limit, and persists metadata only", async () => {
    const requests: Parameters<AiProvider["createResponse"]>[0][] = [];
    const provider: AiProvider = {
      async createResponse(request) {
        requests.push(request);
        return {
          outputText: "OK",
          inputTokens: 10,
          outputTokens: 2,
          totalTokens: 12,
        };
      },
    };
    const { store, records } = createUsageStore();
    const times = [
      new Date("2026-08-07T12:00:00.000Z"),
      new Date("2026-08-07T12:00:00.125Z"),
    ];

    const result = await executeAiRequest(
      {
        feature: "smoke-test",
        input: "sensitive input",
        maxOutputTokens: 16,
        structuredOutput: {
          name: "smoke_output",
          schema: { type: "object", properties: {} },
        },
      },
      { config, provider, usageStore: store, now: () => times.shift()! },
    );

    assert.equal(requests[0].maxOutputTokens, 16);
    assert.equal(requests[0].structuredOutput?.name, "smoke_output");
    assert.equal(result.usage.totalTokens, 12);
    assert.equal(result.usage.durationMs, 125);
    assert.equal(records.length, 1);
    assert.deepEqual(Object.keys(records[0]).sort(), [
      "createdAt",
      "durationMs",
      "estimatedCostUsd",
      "feature",
      "inputTokens",
      "model",
      "outputTokens",
      "status",
    ]);
    assert.equal(JSON.stringify(records[0]).includes("sensitive input"), false);
  });

  it("does not call the provider when the monthly budget is exhausted", async () => {
    let providerCalled = false;
    const provider: AiProvider = {
      async createResponse() {
        providerCalled = true;
        throw new Error("must not run");
      },
    };
    const { store } = createUsageStore(5);

    await assert.rejects(
      executeAiRequest(
        { feature: "ranking", input: "input", maxOutputTokens: 10 },
        { config, provider, usageStore: store },
      ),
      AiBudgetExhaustedError,
    );
    assert.equal(providerCalled, false);
  });

  it("records provider failures without storing request content", async () => {
    const provider: AiProvider = {
      async createResponse() {
        throw new Error("provider unavailable");
      },
    };
    const { store, records } = createUsageStore();

    await assert.rejects(
      executeAiRequest(
        { feature: "smoke-test", input: "private", maxOutputTokens: 10 },
        { config, provider, usageStore: store },
      ),
      AiProviderRequestError,
    );
    assert.equal(records[0].status, "FAILURE");
    assert.equal(records[0].estimatedCostUsd, null);
    assert.equal(JSON.stringify(records[0]).includes("private"), false);
  });
});
