import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extractMetadataDescription, normalizeMetadataDescription } from "./metadata-parser";

describe("extractMetadataDescription", () => {
  it("prefers the standard meta description", () => {
    const html = `
      <meta property="og:description" content="Open Graph">
      <meta name="description" content="Standard description">
    `;
    assert.equal(extractMetadataDescription(html), "Standard description");
  });

  it("falls back to Open Graph and then Twitter metadata", () => {
    assert.equal(
      extractMetadataDescription('<meta property="og:description" content="Open Graph">'),
      "Open Graph",
    );
    assert.equal(
      extractMetadataDescription('<meta name="twitter:description" content="Twitter fallback">'),
      "Twitter fallback",
    );
  });

  it("normalizes whitespace, decodes entities, and rejects empty values", () => {
    assert.equal(
      extractMetadataDescription(
        '<meta name="description" content="  Build\n systems &amp; APIs&nbsp; safely  ">',
      ),
      "Build systems & APIs safely",
    );
    assert.equal(extractMetadataDescription('<meta name="description" content="   ">'), null);
    assert.equal(normalizeMetadataDescription("abcdef", 4), "abcd");
  });
});
