import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { CONTENT_KINDS } from "../src/modules/content-kind/constants";
import { ContentKindBatchError, evaluateContentKind } from "../src/modules/content-kind/service";

function parseArguments(args: string[]): { force: boolean; limit?: number } {
  let force = false;
  let limit: number | undefined;
  for (const argument of args) {
    if (argument === "--force") force = true;
    else if (argument.startsWith("--limit=")) limit = Number(argument.slice("--limit=".length));
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) throw new Error("--limit must be a positive integer, for example --limit=20.");
  return { force, limit };
}

const labels: Record<(typeof CONTENT_KINDS)[number], string> = {
  TECHNICAL_ARTICLE: "Technical articles", TECHNICAL_NEWS: "Technical news",
  OFFICIAL_TECHNICAL: "Official technical", RESEARCH: "Research", REPOSITORY: "Repositories",
  PRODUCT_PAGE: "Product pages", DISCUSSION: "Discussions", OTHER: "Other",
};

async function main() {
  console.log("StackPulse — Content Kind");
  const summary = await evaluateContentKind(parseArguments(process.argv.slice(2)));
  console.log(`\nCandidates: ${summary.candidates}`);
  for (const kind of CONTENT_KINDS) console.log(`${labels[kind]}: ${summary.counts[kind]}`);
  console.log(`\nAI requests: ${summary.aiRequests}`);
  console.log(`Input tokens: ${summary.inputTokens}`);
  console.log(`Output tokens: ${summary.outputTokens}`);
  console.log(`Estimated cost: $${summary.estimatedCostUsd.toFixed(8)}`);
}

main().catch((error: unknown) => {
  const cause = error instanceof ContentKindBatchError ? error.cause : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const causeMessage = cause instanceof Error ? ` ${cause.name}: ${cause.message}` : "";
  console.error(`Content Kind evaluation failed: ${message}${causeMessage}`);
  process.exitCode = 1;
}).finally(async () => { await prisma.$disconnect(); });
