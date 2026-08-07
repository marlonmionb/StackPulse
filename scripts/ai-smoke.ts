import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { executeAiRequest } from "../src/lib/ai";

async function main() {
  console.log("StackPulse — OpenAI smoke test");

  const result = await executeAiRequest({
    feature: "integration-smoke-test",
    input: "Reply with exactly: OK",
    maxOutputTokens: 16,
  });

  console.log(`Response: ${result.outputText.trim()}`);
  console.log(
    `Model: ${result.usage.model}; tokens: ${result.usage.totalTokens}; estimated cost: $${result.usage.estimatedCostUsd?.toFixed(8)}`,
  );
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`OpenAI smoke test failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
