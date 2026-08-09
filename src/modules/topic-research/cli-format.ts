import type { KeyFinding, ResearchSource } from "./types";

export function formatKeyFinding(finding: KeyFinding): string {
  const text = finding.text.replace(/\s*(?:\[s\d+(?:,\s*s\d+)*\]|\(s\d+(?:,\s*s\d+)*\))\s*$/i, "").trimEnd();
  return `- [${finding.confidence}] ${text} [${finding.sourceIds.join(", ")}]`;
}

export function countPrimarySources(sources: readonly Pick<ResearchSource, "type">[]): number {
  return sources.filter((source) => source.type === "PRIMARY").length;
}
