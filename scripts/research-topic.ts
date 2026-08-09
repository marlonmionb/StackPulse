import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { researchTopic } from "../src/modules/topic-research/service";
import { formatKeyFinding } from "../src/modules/topic-research/cli-format";

function parseArguments(args: string[]): { topicId: string; force: boolean } {
  let topicId = ""; let force = false;
  for (const argument of args) {
    if (argument.startsWith("--topic-id=")) topicId = argument.slice("--topic-id=".length).trim();
    else if (argument === "--force") force = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!topicId) throw new Error("--topic-id is required, for example --topic-id=cm123.");
  return { topicId, force };
}

async function main() {
  const { topicId, force } = parseArguments(process.argv.slice(2));
  const result = await researchTopic(topicId, { force });
  console.log("StackPulse — Topic Research\n");
  console.log(`Topic:\n${result.topic.title}\n`);
  if (result.skipped) {
    console.log(`Research already exists (${result.topic.researchCount} report${result.topic.researchCount === 1 ? "" : "s"}). Use --force to create a new report.\nNo AI or Web Search request was made.`);
    return;
  }
  const usage = result.usage!; const report = result.report!;
  console.log("Research completed.\n");
  console.log(`Research ID: ${result.researchId}`);
  console.log(`Sources: ${report.sources.length}`);
  console.log(`Primary sources: ${report.sources.filter((source) => source.type === "PRIMARY").length}`);
  console.log(`Web searches: ${usage.webSearchCalls}\n`);
  console.log(`Input tokens: ${usage.inputTokens}`); console.log(`Output tokens: ${usage.outputTokens}`);
  console.log(`Reasoning tokens: ${usage.reasoningTokens}`);
  console.log(`Token cost: $${(usage.estimatedTokenCostUsd ?? 0).toFixed(8)}`);
  console.log(`Web Search cost: $${(usage.estimatedToolCostUsd ?? 0).toFixed(8)}`);
  console.log(`Estimated total: $${(usage.estimatedCostUsd ?? 0).toFixed(8)}\n`);
  console.log(`Summary:\n${report.summary}\n\nKey findings:`);
  report.keyFindings.forEach((finding) => console.log(formatKeyFinding(finding)));
  console.log("\nSources:"); report.sources.forEach((source, index) => console.log(`${index + 1}. [${source.type}] ${source.title} — ${source.url}`));
}

main().catch((error: unknown) => { console.error(`Topic research failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
