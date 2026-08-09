import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AuthorProfileContext, AuthorProfileValidationResult } from "./types";
import { REQUIRED_AUTHOR_PROFILE_SECTIONS, validateAuthorProfileContent } from "./validation";

export const DEFAULT_AUTHOR_PROFILE_PATH = path.join("docs", "author-profile.md");

export class AuthorProfileLoadError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AuthorProfileLoadError";
  }
}

export async function loadAuthorProfile(
  sourcePath = path.resolve(process.cwd(), DEFAULT_AUTHOR_PROFILE_PATH),
): Promise<AuthorProfileContext> {
  let rawContent: string;
  try {
    rawContent = await readFile(sourcePath, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new AuthorProfileLoadError(`Author Profile file not found at ${sourcePath}.`, { cause: error });
    }
    throw new AuthorProfileLoadError(`Unable to load Author Profile at ${sourcePath}.`, { cause: error });
  }

  const content = rawContent.trim();
  validateAuthorProfileContent(content);

  return {
    content,
    sourcePath,
    characterCount: content.length,
  };
}

export async function validateAuthorProfile(
  sourcePath?: string,
): Promise<AuthorProfileValidationResult> {
  const profile = await loadAuthorProfile(sourcePath);
  return {
    ...profile,
    requiredSections: REQUIRED_AUTHOR_PROFILE_SECTIONS.length,
    totalRequiredSections: REQUIRED_AUTHOR_PROFILE_SECTIONS.length,
  };
}
