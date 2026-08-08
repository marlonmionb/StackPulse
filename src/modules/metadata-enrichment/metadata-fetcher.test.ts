import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertSafePublicHttpUrl,
  fetchMetadataHtml,
  isPrivateAddress,
} from "./metadata-fetcher";

const config = { timeoutMs: 1_000, maxBytes: 1_024 };
const publicResolver = async () => ["203.0.113.10"];

describe("metadata URL safety", () => {
  it("handles malformed URLs and rejects obvious local/private targets", async () => {
    await assert.rejects(assertSafePublicHttpUrl("not a url", publicResolver), /malformed/u);
    await assert.rejects(assertSafePublicHttpUrl("http://localhost/page", publicResolver), /local/u);
    await assert.rejects(assertSafePublicHttpUrl("http://127.0.0.1/page", publicResolver), /local/u);
    await assert.rejects(assertSafePublicHttpUrl("http://192.168.1.5/page", publicResolver), /local/u);
    await assert.rejects(
      assertSafePublicHttpUrl("https://example.test", async () => ["10.0.0.3"]),
      /resolves to a local/u,
    );
    assert.equal(isPrivateAddress("::1"), true);
  });
});

describe("fetchMetadataHtml", () => {
  it("ignores non-HTML responses without reading them as metadata", async () => {
    const result = await fetchMetadataHtml("https://example.com/file.pdf", config, {
      resolveHostname: publicResolver,
      fetchImpl: async () =>
        new Response("pdf", { headers: { "content-type": "application/pdf" } }),
    });
    assert.deepEqual(result, { kind: "NO_METADATA" });
  });

  it("returns bounded HTML and sends an identifying User-Agent", async () => {
    let requestInit: RequestInit | undefined;
    const result = await fetchMetadataHtml("https://example.com/article", config, {
      resolveHostname: publicResolver,
      fetchImpl: async (_input, init) => {
        requestInit = init;
        return new Response("<meta name=description content=test>", {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      },
    });
    assert.equal(result.kind, "HTML");
    assert.match(new Headers(requestInit?.headers).get("user-agent") ?? "", /StackPulse/u);
    assert.equal(requestInit?.redirect, "manual");
  });

  it("rejects bodies beyond the configured byte limit", async () => {
    await assert.rejects(
      fetchMetadataHtml("https://example.com/article", { ...config, maxBytes: 10 }, {
        resolveHostname: publicResolver,
        fetchImpl: async () => new Response("a".repeat(11), {
          headers: { "content-type": "text/html" },
        }),
      }),
      /exceeds 10 bytes/u,
    );
  });

  it("validates every redirect target", async () => {
    await assert.rejects(
      fetchMetadataHtml("https://example.com/article", config, {
        resolveHostname: publicResolver,
        fetchImpl: async () => new Response(null, {
          status: 302,
          headers: { location: "http://127.0.0.1/private" },
        }),
      }),
      /local or private/u,
    );
  });
});
