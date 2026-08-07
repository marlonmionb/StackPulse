import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getHackerNewsSearchLookbackDays,
  getHackerNewsSearchResultsPerTopic,
  getHackerNewsSearchTopics,
} from "./hacker-news-search.config";

describe("Hacker News Search configuration", () => {
  it("parses, trims, ignores empty topics, and removes exact duplicates", () => {
    assert.deepEqual(
      getHackerNewsSearchTopics(
        " react, typescript, ,spring boot,React, distributed systems ",
      ),
      ["react", "typescript", "spring boot", "distributed systems"],
    );
  });

  it("requires at least one topic", () => {
    assert.throws(
      () => getHackerNewsSearchTopics(" , , "),
      /HN_SEARCH_TOPICS must contain at least one/,
    );
  });

  it("uses conservative numeric defaults", () => {
    assert.equal(getHackerNewsSearchLookbackDays(undefined), 7);
    assert.equal(getHackerNewsSearchResultsPerTopic(undefined), 10);
  });

  it("rejects malformed and out-of-range numeric configuration", () => {
    for (const value of ["0", "1.5", "seven", "366"]) {
      assert.throws(() => getHackerNewsSearchLookbackDays(value));
    }

    for (const value of ["-1", "2.5", "many", "101"]) {
      assert.throws(() => getHackerNewsSearchResultsPerTopic(value));
    }
  });
});
