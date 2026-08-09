import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { formatAngleLine } from "../src/modules/angles/cli-format";
import { listAngles } from "../src/modules/angles/service";

export function parseListAngleArguments(args: string[]): string {
  let researchId = "";
  for (const argument of args) {
    if (argument.startsWith("--research-id=")) researchId = argument.slice("--research-id=".length).trim();
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!researchId) throw new Error("--research-id is required, for example --research-id=cm123.");
  return researchId;
}

async function main() {
  const result = await listAngles(parseListAngleArguments(process.argv.slice(2)));
  console.log("StackPulse — Angles\n");
  console.log(`Research: ${result.research.topicTitle} (${result.research.id})\n`);
  if (result.angles.length === 0) { console.log("No angle candidates found."); return; }
  result.angles.forEach((angle) => console.log(formatAngleLine(angle)));
}

main().catch((error: unknown) => { console.error(`Angle listing failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
