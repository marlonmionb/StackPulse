import type { PersistedContentAngle } from "./types";

export function conciseThesis(thesis: string, maximum = 140): string {
  const compact = thesis.replace(/\s+/g, " ").trim();
  return compact.length <= maximum ? compact : `${compact.slice(0, maximum - 1).trimEnd()}…`;
}

export function formatAngleLine(angle: PersistedContentAngle): string {
  return `${String(angle.fitScore).padStart(2)}  ${angle.status.padEnd(9)}  ${angle.authorConnectionType.padEnd(24)}  ${angle.requiresHumanInput ? "INPUT" : "     "}  ${angle.id}  ${angle.title}\n    ${conciseThesis(angle.thesis)}`;
}
