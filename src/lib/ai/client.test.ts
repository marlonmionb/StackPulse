import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractWebSearchResponse } from "./client";

describe("OpenAI Responses Web Search metadata extraction", () => {
  it("combines complete sources from multiple Web Search calls", () => {
    const result = extractWebSearchResponse([
      { type: "web_search_call", action: { type: "search", sources: [
        { type: "url", url: "https://example.com/one" },
        { type: "url", url: "https://example.com/two" },
      ] } },
      { type: "web_search_call", action: { type: "search", sources: [
        { type: "url", url: "https://example.org/three" },
      ] } },
    ]);
    assert.equal(result.webSearchCalls, 2);
    assert.deepEqual(result.webSearchSources.map((source) => source.url), [
      "https://example.com/one", "https://example.com/two", "https://example.org/three",
    ]);
  });

  it("uses URL citations as provider-grounded metadata and merges their titles", () => {
    const result = extractWebSearchResponse([
      { type: "web_search_call", action: { type: "search", sources: [
        { type: "url", url: "https://example.com/spec" },
      ] } },
      { type: "message", content: [{ type: "output_text", text: "Narrative", annotations: [
        { type: "url_citation", url: "https://example.com/spec", title: "Specification" },
        { type: "url_citation", url: "https://example.org/analysis", title: "Analysis" },
      ] }] },
    ]);
    assert.deepEqual(result.webSearchSources, [
      { url: "https://example.com/spec", title: "Specification" },
      { url: "https://example.org/analysis", title: "Analysis" },
    ]);
  });

  it("does not extract ordinary or Markdown URLs from model text", () => {
    const url = "https://github.com/mcp-use/mcp-use/blob/main/benchmark.md";
    const result = extractWebSearchResponse([{ type: "message", content: [{
      type: "output_text", text: `See ${url} and [benchmark](${url}).`, annotations: [],
    }] }]);
    assert.equal(result.outputText.includes(url), true);
    assert.deepEqual(result.webSearchSources, []);
  });

  it("does not treat open-page or find actions as the complete search source list", () => {
    const result = extractWebSearchResponse([
      { type: "web_search_call", action: { type: "open_page", url: "https://example.com/opened" } },
      { type: "web_search_call", action: { type: "find_in_page", url: "https://example.com/found", pattern: "x" } },
    ]);
    assert.equal(result.webSearchCalls, 2);
    assert.deepEqual(result.webSearchSources, []);
  });
});
