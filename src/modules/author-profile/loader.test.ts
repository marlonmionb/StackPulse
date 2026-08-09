import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  AUTHOR_PROFILE_MAX_CHARACTERS,
  AuthorProfileLoadError,
  AuthorProfileValidationError,
  REQUIRED_AUTHOR_PROFILE_SECTIONS,
  loadAuthorProfile,
  validateAuthorProfile,
} from ".";
import { formatAuthorProfileValidation } from "./cli-format";

const temporaryDirectories: string[] = [];

async function temporaryProfile(content: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "stackpulse-author-profile-"));
  temporaryDirectories.push(directory);
  const sourcePath = path.join(directory, "author-profile.md");
  await writeFile(sourcePath, content, "utf8");
  return sourcePath;
}

function validProfileContent(): string {
  return [
    "# Author Profile",
    "",
    ...REQUIRED_AUTHOR_PROFILE_SECTIONS.flatMap((section) => [
      `## ${section}`,
      "",
      `Factual context for ${section}.`,
      "",
    ]),
  ].join("\n");
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Author Profile loader", () => {
  it("loads a valid UTF-8 Markdown profile as typed prompt-ready content", async () => {
    const content = validProfileContent();
    const sourcePath = await temporaryProfile(content);
    const profile = await loadAuthorProfile(sourcePath);

    assert.equal(profile.content, content.trim());
    assert.equal(profile.sourcePath, sourcePath);
    assert.equal(profile.characterCount, content.trim().length);
    assert.match(profile.content, /^# Author Profile\n/);
  });

  it("fails clearly when the profile file does not exist", async () => {
    const sourcePath = path.join(tmpdir(), "stackpulse-missing-author-profile.md");
    await assert.rejects(() => loadAuthorProfile(sourcePath), (error: unknown) => {
      assert.ok(error instanceof AuthorProfileLoadError);
      assert.match(error.message, /Author Profile file not found/);
      assert.match(error.message, /stackpulse-missing-author-profile\.md/);
      return true;
    });
  });

  it("rejects an empty or whitespace-only profile", async () => {
    const sourcePath = await temporaryProfile(" \n\t\n ");
    await assert.rejects(() => loadAuthorProfile(sourcePath), AuthorProfileValidationError);
    await assert.rejects(() => loadAuthorProfile(sourcePath), /Author Profile is empty/);
  });

  it("rejects a profile larger than the centralized character limit", async () => {
    const oversized = `${validProfileContent()}\n${"x".repeat(AUTHOR_PROFILE_MAX_CHARACTERS)}`;
    const sourcePath = await temporaryProfile(oversized);
    await assert.rejects(() => loadAuthorProfile(sourcePath), /maximum is 12,000/);
  });

  it("rejects a profile missing a required conceptual section", async () => {
    const content = validProfileContent().replace("## Content Goals", "## Editorial Goals");
    const sourcePath = await temporaryProfile(content);
    await assert.rejects(() => loadAuthorProfile(sourcePath), /missing required section: Content Goals/);
  });

  it("trims only whitespace at the file boundaries", async () => {
    const content = validProfileContent();
    const sourcePath = await temporaryProfile(`\n\t${content}\n\n `);
    const profile = await loadAuthorProfile(sourcePath);
    assert.equal(profile.content, content.trim());
  });

  it("validates the default repository profile and reports command success without dumping it", async () => {
    const result = await validateAuthorProfile();
    const output = formatAuthorProfileValidation(result);

    assert.equal(result.requiredSections, 6);
    assert.equal(result.totalRequiredSections, 6);
    assert.match(output, /StackPulse — Author Profile/);
    assert.match(output, /Path: docs\/author-profile\.md/);
    assert.match(output, /Status: valid/);
    assert.match(output, /Required sections: 6\/6/);
    assert.doesNotMatch(output, /## Verified Professional Experience/);
  });

  it("keeps the runtime module independent from AI infrastructure", async () => {
    const moduleDirectory = path.resolve(process.cwd(), "src", "modules", "author-profile");
    const runtimeFiles = ["index.ts", "loader.ts", "types.ts", "validation.ts", "cli-format.ts"];
    const source = (await Promise.all(runtimeFiles.map((file) => readFile(path.join(moduleDirectory, file), "utf8")))).join("\n");

    assert.doesNotMatch(source, /(?:@\/lib\/ai|openai|executeAiRequest)/i);
  });
});
