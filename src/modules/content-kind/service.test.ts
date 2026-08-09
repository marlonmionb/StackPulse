import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AiExecutionResult } from "@/lib/ai";
import type { ContentKindRepository } from "./repository";
import { evaluateContentKind } from "./service";
import type { ContentKindCandidate, ContentKindClassification } from "./types";

function candidate(id: string): ContentKindCandidate {
  return { id, title: `Item ${id}`, url: `https://example.com/${id}`, source: "test", contentType: "ARTICLE", summary: null, technicalCategory: "SOFTWARE_ENGINEERING" };
}

function result(classifications: ContentKindClassification[]): AiExecutionResult {
  return { outputText: JSON.stringify({ classifications }), usage: { feature: "content-kind", model: "gpt-5.4-nano", inputTokens: 100, outputTokens: 40, totalTokens: 140, requestedAt: new Date(), durationMs: 5, status: "SUCCESS", estimatedCostUsd: 0.00007 } };
}

describe("evaluateContentKind", () => {
  it("uses the shared bounded AI contract and transaction-ready classifications", async () => {
    const persisted: ContentKindClassification[] = [];
    const repository: ContentKindRepository = { async findCandidates() { return [candidate("product"), candidate("article"), candidate("official"), candidate("research")]; }, async persistBatch(items) { persisted.push(...items); } };
    const kinds = ["PRODUCT_PAGE", "TECHNICAL_ARTICLE", "OFFICIAL_TECHNICAL", "RESEARCH"] as const;
    const summary = await evaluateContentKind({}, { repository, executeAi: async (request) => {
      assert.equal(request.model, "gpt-5.4-nano");
      assert.equal(request.maxOutputTokens, 2_000);
      assert.ok(request.structuredOutput);
      return result(kinds.map((contentKind, index) => ({ sourceItemId: ["product", "article", "official", "research"][index], contentKind, confidence: "HIGH", reason: "A concise semantic classification reason." })));
    } });
    assert.deepEqual(persisted.map((item) => item.contentKind), [...kinds]);
    assert.equal(summary.counts.PRODUCT_PAGE, 1);
    assert.equal(summary.aiRequests, 1);
  });

  it("supports skip-by-default and deliberate force re-evaluation", async () => {
    let evaluated = false;
    let requests = 0;
    const repository: ContentKindRepository = { async findCandidates({ force }) { return force || !evaluated ? [candidate("one")] : []; }, async persistBatch() { evaluated = true; } };
    const executeAi = async () => { requests += 1; return result([{ sourceItemId: "one", contentKind: "TECHNICAL_ARTICLE", confidence: "HIGH", reason: "Substantive technical article." }]); };
    await evaluateContentKind({}, { repository, executeAi });
    const skipped = await evaluateContentKind({}, { repository, executeAi });
    await evaluateContentKind({ force: true }, { repository, executeAi });
    assert.equal(skipped.candidates, 0);
    assert.equal(requests, 2);
  });
});
