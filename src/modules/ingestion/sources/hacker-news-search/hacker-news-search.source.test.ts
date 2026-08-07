import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HackerNewsSearchSource,
  buildHackerNewsSearchUrl,
  calculateHackerNewsSearchCutoff,
} from "./hacker-news-search.source";

describe("HackerNewsSearchSource", () => {
  it("calculates an inclusive lookback cutoff in Unix seconds", () => {
    assert.equal(
      calculateHackerNewsSearchCutoff(7, new Date("2026-08-07T12:00:00Z")),
      Date.parse("2026-07-31T12:00:00Z") / 1_000,
    );
  });

  it("constructs safe Algolia query parameters", () => {
    const url = buildHackerNewsSearchUrl(
      "C++ & distributed systems",
      1_700_000_000,
      12,
    );

    assert.equal(url.origin, "https://hn.algolia.com");
    assert.equal(url.pathname, "/api/v1/search_by_date");
    assert.equal(url.searchParams.get("query"), "C++ & distributed systems");
    assert.equal(url.searchParams.get("tags"), "story");
    assert.equal(
      url.searchParams.get("numericFilters"),
      "created_at_i>=1700000000",
    );
    assert.equal(url.searchParams.get("hitsPerPage"), "12");
  });

  it("queries every topic and combines hits without detail requests", async () => {
    const requestedUrls: URL[] = [];
    const source = new HackerNewsSearchSource(
      ["react", "postgresql"],
      7,
      10,
      async (input) => {
        const url = new URL(input);
        requestedUrls.push(url);
        return Response.json({
          hits: [{ objectID: url.searchParams.get("query"), title: "Story" }],
        });
      },
      () => new Date("2026-08-07T12:00:00Z"),
    );

    const hits = await source.fetch();

    assert.deepEqual(
      hits.map((hit) => hit.objectID),
      ["react", "postgresql"],
    );
    assert.equal(requestedUrls.length, 2);
    assert.ok(requestedUrls.every((url) => url.searchParams.has("query")));
  });

  it("keeps successful topics when another request fails", async () => {
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));

    try {
      const source = new HackerNewsSearchSource(
        ["react", "kafka"],
        7,
        10,
        async (input) => {
          const topic = new URL(input).searchParams.get("query");
          return topic === "kafka"
            ? new Response(null, { status: 503 })
            : Response.json({ hits: [{ objectID: "1" }] });
        },
      );

      assert.equal((await source.fetch()).length, 1);
      assert.match(warnings[0], /"kafka".*503/);
    } finally {
      console.warn = originalWarn;
    }
  });
});
