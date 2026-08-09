import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { generateAngles } from "../src/modules/angles/service";
import { conciseThesis } from "../src/modules/angles/cli-format";

export function parseGenerateAngleArguments(args: string[]): { researchId: string; force: boolean } {
  let researchId = ""; let force = false;
  for (const argument of args) {
    if (argument.startsWith("--research-id=")) researchId = argument.slice("--research-id=".length).trim();
    else if (argument === "--force") force = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!researchId) throw new Error("--research-id is required, for example --research-id=cm123.");
  return { researchId, force };
}

async function main() {
  const { researchId, force } = parseGenerateAngleArguments(process.argv.slice(2));
  const result = await generateAngles(researchId, { force });
  console.log("StackPulse — Angle Generation\n");
  console.log(`Research:\n${result.research.topic.title} (${result.research.id})\n`);
  if (result.skipped) {
    console.log(`Angles already exist (${result.research.angleCount} candidate${result.research.angleCount === 1 ? "" : "s"}). Use --force to create a new generation.\nNo AI request was made.`);
    return;
  }
  console.log(`Author Profile:\nvalid · ${result.authorProfile!.characterCount.toLocaleString("en-US")} characters · hash ${result.authorProfile!.hash.slice(0, 12)}…\n`);
  console.log(`Angles generated: ${result.angles.length}\nAI requests: 1\n`);
  result.angles.forEach((angle, index) => {
    console.log(`${index + 1}. [${angle.fitScore}] ${angle.title}`);
    console.log(`   ${angle.authorConnectionType}`);
    console.log(`   ${conciseThesis(angle.thesis, 180)}`);
    console.log(`   Human input: ${angle.requiresHumanInput ? "yes" : "no"}`);
    console.log(`   Angle ID: ${angle.id}\n`);
  });
  const usage = result.usage!;
  console.log(`Input tokens: ${usage.inputTokens}`);
  console.log(`Output tokens: ${usage.outputTokens}`);
  console.log(`Reasoning tokens: ${usage.reasoningTokens}`);
  console.log(`Estimated cost: $${(usage.estimatedCostUsd ?? 0).toFixed(8)}\n`);
  console.log("Select manually with:\nnpm run angles:select -- --angle-id=<id>");
}

main().catch((error: unknown) => { console.error(`Angle generation failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
