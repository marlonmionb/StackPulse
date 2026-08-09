import path from "node:path";
import type { AuthorProfileValidationResult } from "./types";

export function formatAuthorProfileValidation(
  result: AuthorProfileValidationResult,
  workingDirectory = process.cwd(),
): string {
  const relativePath = path.relative(workingDirectory, result.sourcePath) || result.sourcePath;
  return [
    "StackPulse — Author Profile",
    "",
    `Path: ${relativePath.split(path.sep).join("/")}`,
    "Status: valid",
    `Characters: ${result.characterCount.toLocaleString("en-US")}`,
    `Required sections: ${result.requiredSections}/${result.totalRequiredSections}`,
  ].join("\n");
}
