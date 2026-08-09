export const AUTHOR_PROFILE_MAX_CHARACTERS = 12_000;

export const REQUIRED_AUTHOR_PROFILE_SECTIONS = [
  "Professional Positioning",
  "Verified Professional Experience",
  "Personal Project Experience",
  "Currently Learning / Exploring",
  "Content Goals",
  "Authoring Rules",
] as const;

export class AuthorProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorProfileValidationError";
  }
}

function markdownHeadings(content: string): Set<string> {
  const headings = new Set<string>();
  for (const line of content.split("\n")) {
    const match = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (match) headings.add(match[1].trim());
  }
  return headings;
}

export function validateAuthorProfileContent(content: string): void {
  if (!content) {
    throw new AuthorProfileValidationError("Author Profile is empty.");
  }

  if (content.length > AUTHOR_PROFILE_MAX_CHARACTERS) {
    throw new AuthorProfileValidationError(
      `Author Profile is ${content.length.toLocaleString("en-US")} characters; the maximum is ${AUTHOR_PROFILE_MAX_CHARACTERS.toLocaleString("en-US")}.`,
    );
  }

  const headings = markdownHeadings(content);
  const missingSections = REQUIRED_AUTHOR_PROFILE_SECTIONS.filter((section) => !headings.has(section));
  if (missingSections.length > 0) {
    throw new AuthorProfileValidationError(
      `Author Profile is missing required section${missingSections.length === 1 ? "" : "s"}: ${missingSections.join(", ")}.`,
    );
  }
}
