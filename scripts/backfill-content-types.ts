import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { backfillContentTypes } from "../src/modules/ingestion/content-type-backfill";

function parseArguments(args: string[]): { limit?: number } {
  let limit: number | undefined;

  for (const argument of args) {
    if (argument.startsWith("--limit=")) {
      limit = Number(argument.slice("--limit=".length));
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new Error("--limit must be a positive integer, for example --limit=20.");
  }
  return { limit };
}

async function main() {
  const summary = await backfillContentTypes(parseArguments(process.argv.slice(2)));
  console.log("StackPulse — Content Type Backfill");
  console.log(`\nCandidates: ${summary.candidates}`);
  console.log(`Articles: ${summary.articles}`);
  console.log(`Videos: ${summary.videos}`);
  console.log(`Still unknown: ${summary.stillUnknown}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Content type backfill failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
