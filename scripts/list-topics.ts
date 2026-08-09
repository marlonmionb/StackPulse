import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { listTopics } from "../src/modules/topics/selection";

function parseArguments(args: string[]): { limit: number; includeHistorical: boolean } {
  let limit = 20;
  let includeHistorical = false;
  for (const argument of args) {
    if (argument.startsWith("--limit=")) limit = Number(argument.slice(8));
    else if (argument === "--include-historical" || argument === "--all") includeHistorical = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!Number.isInteger(limit) || limit <= 0 || limit > 200) throw new Error("--limit must be an integer from 1 to 200.");
  return { limit, includeHistorical };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const topics = await listTopics(options);
  console.log("StackPulse — Topics\n");
  if (topics.length === 0) {
    console.log(options.includeHistorical ? "No Topics found." : "No current selectable Topics found.");
    return;
  }
  for (const topic of topics) {
    const score = topic.score?.toFixed(1).padStart(4) ?? "   -";
    const research = topic.researchCount === 0 ? "NO_RESEARCH" : `${topic.researchCount}_REPORT${topic.researchCount === 1 ? "" : "S"}`;
    console.log(`${score}  ${topic.status.padEnd(10)}  ${research.padEnd(12)}  ${topic.selectability.label.padEnd(17)}  ${topic.id}  ${topic.title}`);
  }
}

main().catch((error: unknown) => {
  console.error(`Topic listing failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}).finally(async () => prisma.$disconnect());
