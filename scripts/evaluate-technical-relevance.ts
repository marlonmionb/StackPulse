import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { evaluateTechnicalRelevance, TechnicalRelevanceBatchError } from "../src/modules/technical-relevance/service";

function parseArguments(args: string[]): { force: boolean; limit?: number } {
  let force = false;
  let limit: number | undefined;

  for (const argument of args) {
    if (argument === "--force") {
      force = true;
    } else if (argument.startsWith("--limit=")) {
      limit = Number(argument.slice("--limit=".length));
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer, for example --limit=10.");
  }
  return { force, limit };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  console.log("StackPulse — Technical Relevance");
  const summary = await evaluateTechnicalRelevance(options);

  console.log(`\nCandidates: ${summary.candidates}`);
  console.log(`Evaluated: ${summary.evaluated}`);
  console.log(`Relevant: ${summary.relevant}`);
  console.log(`Rejected: ${summary.rejected}`);
  console.log(`AI requests: ${summary.aiRequests}`);
  console.log(`Tokens: ${summary.inputTokens} input, ${summary.outputTokens} output`);
  console.log(`Estimated cost: $${summary.estimatedCostUsd.toFixed(8)}`);

  if (summary.rejectedTitles.length > 0) {
    console.log("\nRejected:");
    for (const title of summary.rejectedTitles) console.log(`- ${title}`);
  }
}

main()
  .catch((error: unknown) => {
    const cause = error instanceof TechnicalRelevanceBatchError ? error.cause : undefined;
    const message = error instanceof Error ? error.message : String(error);
    const causeMessage = cause instanceof Error ? ` ${cause.name}: ${cause.message}` : "";
    console.error(`Technical relevance evaluation failed: ${message}${causeMessage}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
