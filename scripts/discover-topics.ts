import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { discoverTopics } from "../src/modules/topics/service";

function parseArguments(args: string[]): { limit?: number } {
  let limit: number | undefined;
  for (const argument of args) {
    if (argument.startsWith("--limit=")) limit = Number(argument.slice("--limit=".length));
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer, for example --limit=10.");
  }
  return { limit };
}

async function main() {
  console.log("StackPulse — Topic Discovery");
  const summary = await discoverTopics(parseArguments(process.argv.slice(2)));
  console.log(`\nCandidates: ${summary.candidates}`);
  console.log(`Topics discovered: ${summary.topics.length}`);
  console.log(`AI requests: ${summary.aiRequests}`);
  if (summary.topics.length > 0) {
    console.log("");
    summary.topics.forEach((topic, index) => console.log(`${index + 1}. ${topic.title} — ${topic.overallScore.toFixed(1)}`));
  }
  console.log("\nTokens:");
  console.log(`Input: ${summary.inputTokens}`);
  console.log(`Output: ${summary.outputTokens}`);
  console.log(`Estimated cost: $${summary.estimatedCostUsd.toFixed(8)}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error(`Topic discovery failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => { await prisma.$disconnect(); });
