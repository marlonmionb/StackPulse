import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { IngestionService } from "../src/modules/ingestion/ingestion.service";
import { normalizeHackerNewsItem } from "../src/modules/ingestion/normalizers/hacker-news.normalizer";
import { getHackerNewsIngestionLimit } from "../src/modules/ingestion/sources/hacker-news/hacker-news.config";
import { HackerNewsSource } from "../src/modules/ingestion/sources/hacker-news/hacker-news.source";

async function main() {
  console.log("StackPulse — Hacker News ingestion\n");
  console.log("Fetching stories...");

  const limit = getHackerNewsIngestionLimit();
  const service = new IngestionService(
    new HackerNewsSource(limit),
    normalizeHackerNewsItem,
  );
  const summary = await service.run();

  console.log(`Fetched: ${summary.fetched}`);
  console.log(`Normalized: ${summary.normalized}`);
  console.log(`Inserted: ${summary.inserted}`);
  console.log(`Skipped: ${summary.skipped}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Hacker News ingestion failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
