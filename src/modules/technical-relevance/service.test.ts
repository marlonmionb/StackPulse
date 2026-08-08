import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiExecutionResult } from "@/lib/ai";
import type { TechnicalRelevanceRepository } from "./repository";
import {
  evaluateTechnicalRelevance,
  TechnicalRelevanceBatchError,
} from "./service";
import type {
  PersistedTechnicalRelevanceClassification,
  TechnicalRelevanceCandidate,
} from "./types";

function candidate(id: string, title: string): TechnicalRelevanceCandidate {
  return {
    id,
    title,
    url: `https://example.com/${id}`,
    source: "test",
    contentType: "ARTICLE",
    summary: null,
    publishedAt: null,
  };
}

function aiResult(classifications: unknown[]): AiExecutionResult {
  return {
    outputText: JSON.stringify({ classifications }),
    usage: {
      feature: "technical-relevance",
      model: "gpt-5.4-nano",
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      requestedAt: new Date("2026-08-07T12:00:00Z"),
      durationMs: 10,
      status: "SUCCESS",
      estimatedCostUsd: 0.0000825,
    },
  };
}

describe("evaluateTechnicalRelevance", () => {
  it("persists relevant and irrelevant classifications with the threshold applied", async () => {
    const persisted: PersistedTechnicalRelevanceClassification[][] = [];
    const repository: TechnicalRelevanceRepository = {
      async findCandidates() {
        return [candidate("react", "React Compiler improvements"), candidate("virus", "Virus reactivation in long Covid")];
      },
      async persistBatch(items) {
        persisted.push(items);
      },
    };

    const summary = await evaluateTechnicalRelevance({}, {
      repository,
      executeAi: async (request) => {
        assert.equal(request.model, "gpt-5.4-nano");
        assert.equal(request.maxOutputTokens, 2_000);
        assert.ok(request.structuredOutput);
        return aiResult([
          { sourceItemId: "react", relevant: true, relevanceScore: 9, category: "FRONTEND", reason: "About React compiler engineering." },
          { sourceItemId: "virus", relevant: false, relevanceScore: 0, category: "NON_SOFTWARE", reason: "A medical article about viral reactivation." },
        ]);
      },
      now: () => new Date("2026-08-07T13:00:00Z"),
    });

    assert.equal(persisted[0][0].technicalRelevant, true);
    assert.equal(persisted[0][1].technicalRelevant, false);
    assert.deepEqual({ relevant: summary.relevant, rejected: summary.rejected, aiRequests: summary.aiRequests }, { relevant: 1, rejected: 1, aiRequests: 1 });
  });

  it("does not charge persisted items again, while force re-evaluates deliberately", async () => {
    const item = candidate("one", "Building event-driven systems with Kafka");
    let evaluated = false;
    let requests = 0;
    const repository: TechnicalRelevanceRepository = {
      async findCandidates({ force }) {
        return force || !evaluated ? [item] : [];
      },
      async persistBatch() {
        evaluated = true;
      },
    };
    const executeAi = async () => {
      requests += 1;
      return aiResult([{ sourceItemId: "one", relevant: true, relevanceScore: 9, category: "ARCHITECTURE", reason: "About event-driven software systems." }]);
    };

    await evaluateTechnicalRelevance({}, { repository, executeAi });
    const rerun = await evaluateTechnicalRelevance({}, { repository, executeAi });
    await evaluateTechnicalRelevance({ force: true }, { repository, executeAi });

    assert.equal(rerun.candidates, 0);
    assert.equal(requests, 2);
  });

  it("preserves successful batches and leaves a failed batch unpersisted", async () => {
    const persistedIds: string[] = [];
    let requests = 0;
    const repository: TechnicalRelevanceRepository = {
      async findCandidates() {
        return [candidate("one", "PostgreSQL changes"), candidate("two", "Spring rainfall")];
      },
      async persistBatch(items) {
        persistedIds.push(...items.map((item) => item.sourceItemId));
      },
    };

    await assert.rejects(
      evaluateTechnicalRelevance(
        { batchSize: 1 },
        {
          repository,
          executeAi: async () => {
            requests += 1;
            if (requests === 2) throw new Error("provider unavailable");
            return aiResult([{ sourceItemId: "one", relevant: true, relevanceScore: 9, category: "DATABASE", reason: "About PostgreSQL engineering." }]);
          },
        },
      ),
      (error: unknown) => {
        assert.ok(error instanceof TechnicalRelevanceBatchError);
        assert.equal(error.batchNumber, 2);
        assert.equal(error.completed.evaluated, 1);
        return true;
      },
    );
    assert.deepEqual(persistedIds, ["one"]);
  });
});
