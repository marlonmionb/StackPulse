import "dotenv/config";
import { prisma } from "../src/lib/db/prisma";
import { selectAngle } from "../src/modules/angles/service";

export function parseSelectAngleArguments(args: string[]): string {
  let angleId = "";
  for (const argument of args) {
    if (argument.startsWith("--angle-id=")) angleId = argument.slice("--angle-id=".length).trim();
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!angleId) throw new Error("--angle-id is required, for example --angle-id=cm123.");
  return angleId;
}

async function main() {
  const angle = await selectAngle(parseSelectAngleArguments(process.argv.slice(2)));
  console.log("StackPulse — Angle Selected\n");
  console.log(`Research: ${angle.researchTitle} (${angle.topicResearchId})`);
  console.log(`Angle: ${angle.id}`);
  console.log(`Title: ${angle.title}`);
  console.log(`Connection: ${angle.authorConnectionType}`);
}

main().catch((error: unknown) => { console.error(`Angle selection failed: ${error instanceof Error ? error.message : String(error)}`); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
