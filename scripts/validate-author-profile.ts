import { formatAuthorProfileValidation } from "../src/modules/author-profile/cli-format";
import { validateAuthorProfile } from "../src/modules/author-profile";

async function main() {
  const result = await validateAuthorProfile();
  console.log(formatAuthorProfileValidation(result));
}

main().catch((error: unknown) => {
  console.error(`Author Profile validation failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
