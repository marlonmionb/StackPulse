import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { enrichSourceMetadata } from "../src/modules/metadata-enrichment/service";

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
    throw new Error("--limit must be a positive integer, for example --limit=20.");
  }
  return { force, limit };
}

async function main() {
  const summary = await enrichSourceMetadata(parseArguments(process.argv.slice(2)));
  console.log("StackPulse — Metadata Enrichment");
  console.log(`\nCandidates: ${summary.candidates}`);
  console.log(`Enriched: ${summary.enriched}`);
  console.log(`No metadata: ${summary.noMetadata}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Skipped: ${summary.skipped}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Metadata enrichment failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
