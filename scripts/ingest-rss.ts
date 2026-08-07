import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { IngestionService } from "../src/modules/ingestion/ingestion.service";
import { normalizeRssItem } from "../src/modules/ingestion/normalizers/rss.normalizer";
import { getRssFeedUrls } from "../src/modules/ingestion/sources/rss/rss.config";
import { RssSource } from "../src/modules/ingestion/sources/rss/rss.source";

async function main() {
  console.log("StackPulse — RSS ingestion\n");

  const feedUrls = getRssFeedUrls();
  console.log(`Fetching ${feedUrls.length} feed(s)...`);

  const service = new IngestionService(
    new RssSource(feedUrls),
    normalizeRssItem,
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
    console.error(`RSS ingestion failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
