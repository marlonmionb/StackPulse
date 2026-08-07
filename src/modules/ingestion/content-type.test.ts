import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentType, detectContentType } from "./content-type";

describe("detectContentType", () => {
  it("classifies YouTube hosts as video", () => {
    for (const url of [
      "https://youtube.com/shorts/abc",
      "https://www.youtube.com/watch?v=abc",
      "https://m.youtube.com/watch?v=abc",
      "https://youtu.be/abc",
    ]) {
      assert.equal(detectContentType(url), ContentType.VIDEO);
    }
  });

  it("classifies normal web URLs as articles", () => {
    assert.equal(
      detectContentType("https://example.com/technical-article"),
      ContentType.ARTICLE,
    );
  });

  it("does not classify lookalike domains as YouTube", () => {
    for (const url of [
      "https://notyoutube.com/",
      "https://youtube.com.example.org/",
    ]) {
      assert.equal(detectContentType(url), ContentType.ARTICLE);
    }
  });

  it("handles malformed and non-web URLs as unknown", () => {
    assert.equal(detectContentType("not-a-url"), ContentType.UNKNOWN);
    assert.equal(
      detectContentType("mailto:author@example.com"),
      ContentType.UNKNOWN,
    );
  });
});
