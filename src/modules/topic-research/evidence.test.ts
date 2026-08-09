import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectWebSearchEvidence,
  consolidateResearchEvidence,
  parseWebResearchNarrative,
} from "./evidence";
import type { RawResearchEvidence } from "./types";

function raw(url: string, overrides: Partial<RawResearchEvidence> = {}): RawResearchEvidence {
  return {
    title: "Interlock", url, publisher: null, publishedAt: null, type: "SECONDARY",
    evidence: "Repository evidence.", origin: "WEB_SEARCH", ...overrides,
  };
}

describe("Topic Research evidence consolidation", () => {
  it("collapses duplicate exact provider URLs into one internal ID", () => {
    const web = collectWebSearchEvidence([
      { url: "https://github.com/jajego/interlock", title: null },
      { url: "https://github.com/jajego/interlock", title: "Interlock repository" },
    ]);
    const result = consolidateResearchEvidence([], web);
    assert.equal(result.length, 1); assert.equal(result[0].id, "s1");
    assert.equal(result[0].title, "Interlock repository");
  });

  it("collapses a seed URL duplicated by provider metadata and merges metadata", () => {
    const result = consolidateResearchEvidence(
      [raw("https://github.com/jajego/interlock", { title: "Interlock", type: "PRIMARY", origin: "TOPIC_SEED" })],
      collectWebSearchEvidence([{ url: "https://github.com/jajego/interlock/", title: "Interlock distributed locking repository" }]),
    );
    assert.equal(result.length, 1); assert.equal(result[0].id, "s1");
    assert.equal(result[0].title, "Interlock distributed locking repository");
    assert.equal(result[0].publisher, "github.com"); assert.equal(result[0].type, "PRIMARY");
    assert.equal(result[0].origin, "TOPIC_SEED_AND_WEB_SEARCH");
  });

  it("collapses canonical-equivalent provider URLs and keeps different sources distinct", () => {
    const result = consolidateResearchEvidence([], collectWebSearchEvidence([
      { url: "https://example.com/spec/?utm_source=search", title: null },
      { url: "https://example.com/spec#section", title: "Detailed specification" },
      { url: "https://example.org/analysis", title: "Independent analysis" },
    ]));
    assert.deepEqual(result.map(({ id, canonicalUrl }) => ({ id, canonicalUrl })), [
      { id: "s1", canonicalUrl: "https://example.com/spec" },
      { id: "s2", canonicalUrl: "https://example.org/analysis" },
    ]);
    assert.equal(result[0].title, "Detailed specification");
  });

  it("safely excludes invalid and non-HTTP(S) provider sources", () => {
    const result = collectWebSearchEvidence([
      { url: "not-a-url", title: "Invalid" },
      { url: "mailto:research@example.com", title: "Email" },
      { url: "ftp://example.com/file", title: "FTP" },
      { url: "https://example.com/spec", title: "Specification" },
    ]);
    assert.equal(result.length, 1); assert.equal(result[0].url, "https://example.com/spec");
  });

  it("ignores plain, Markdown, child, and same-host URLs found only in model narrative", () => {
    const repository = "https://github.com/mcp-use/mcp-use";
    const child = `${repository}/blob/main/benchmark.md`;
    const sameHost = "https://github.com/unrelated/project";
    const narrative = parseWebResearchNarrative(JSON.stringify({
      researchNarrative: `See ${child}, [benchmark](${child}), and ${sameHost}.`,
      url: child,
      evidence: [{ url: child }],
    }));
    const evidence = consolidateResearchEvidence(
      [raw(repository, { origin: "TOPIC_SEED", type: "PRIMARY" })],
      collectWebSearchEvidence([]),
    );
    assert.match(narrative, /benchmark\.md/);
    assert.deepEqual(evidence.map((source) => source.canonicalUrl), [repository]);
  });

  it("accepts a repository child URL only when provider metadata actually returns it", () => {
    const repository = "https://github.com/mcp-use/mcp-use";
    const child = `${repository}/blob/main/benchmark.md`;
    const evidence = consolidateResearchEvidence(
      [raw(repository, { origin: "TOPIC_SEED", type: "PRIMARY" })],
      collectWebSearchEvidence([{ url: child, title: "mcp-use benchmark" }]),
    );
    assert.deepEqual(evidence.map(({ id, canonicalUrl }) => ({ id, canonicalUrl })), [
      { id: "s1", canonicalUrl: repository },
      { id: "s2", canonicalUrl: child },
    ]);
  });
});
