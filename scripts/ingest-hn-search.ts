import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { IngestionService } from "../src/modules/ingestion/ingestion.service";
import { normalizeHackerNewsSearchHit } from "../src/modules/ingestion/normalizers/hacker-news-search.normalizer";
import {
  getHackerNewsSearchLookbackDays,
  getHackerNewsSearchResultsPerTopic,
  getHackerNewsSearchTopics,
} from "../src/modules/ingestion/sources/hacker-news-search/hacker-news-search.config";
import { HackerNewsSearchSource } from "../src/modules/ingestion/sources/hacker-news-search/hacker-news-search.source";

async function main() {
  console.log("StackPulse — Hacker News Search\n");

  const topics = getHackerNewsSearchTopics();
  const lookbackDays = getHackerNewsSearchLookbackDays();
  const resultsPerTopic = getHackerNewsSearchResultsPerTopic();
  const service = new IngestionService(
    new HackerNewsSearchSource(topics, lookbackDays, resultsPerTopic),
    normalizeHackerNewsSearchHit,
  );
  const summary = await service.run();

  console.log(`Topics searched: ${topics.length}`);
  console.log(`Raw results: ${summary.fetched}`);
  console.log(`Normalized: ${summary.normalized}`);
  console.log(`Inserted: ${summary.inserted}`);
  console.log(`Skipped/duplicates: ${summary.skipped}`);
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Hacker News Search ingestion failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
