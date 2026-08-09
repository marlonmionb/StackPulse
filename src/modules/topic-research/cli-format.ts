import type { KeyFinding } from "./types";

export function formatKeyFinding(finding: KeyFinding): string {
  const text = finding.text.replace(/\s*(?:\[s\d+(?:,\s*s\d+)*\]|\(s\d+(?:,\s*s\d+)*\))\s*$/i, "").trimEnd();
  return `- [${finding.confidence}] ${text} [${finding.sourceIds.join(", ")}]`;
}
