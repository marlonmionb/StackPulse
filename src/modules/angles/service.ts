import { createHash, randomUUID } from "node:crypto";
import { executeAiRequest, type AiExecutionResult, type ExecuteAiRequest } from "@/lib/ai";
import { loadAuthorProfile, type AuthorProfileContext } from "@/modules/author-profile";
import { ANGLE_GENERATION_FEATURE } from "./constants";
import { getAngleGenerationConfig, type AngleGenerationConfig } from "./config";
import { buildAngleGenerationPrompt } from "./prompt";
import { angleRepository, type AngleRepository } from "./repository";
import { angleGenerationOutputFormat } from "./structured-output";
import type { AngleGenerationResult, PersistedContentAngle, SelectedContentAngle } from "./types";
import { parseAndValidateAngleOutput, validateAngleResearch } from "./validation";

type Dependencies = {
  repository?: AngleRepository;
  executeAi?: (request: ExecuteAiRequest) => Promise<AiExecutionResult>;
  loadProfile?: () => Promise<AuthorProfileContext>;
  config?: AngleGenerationConfig;
  now?: () => Date;
  generationId?: () => string;
};

export function hashAuthorProfile(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function generateAngles(researchId: string, options: { force?: boolean } = {}, dependencies: Dependencies = {}): Promise<AngleGenerationResult> {
  const id = researchId.trim();
  if (!id) throw new Error("--research-id is required.");
  const repository = dependencies.repository ?? angleRepository;
  const research = await repository.findResearch(id);
  if (!research) throw new Error(`TopicResearch not found: ${id}.`);
  validateAngleResearch(research);
  if (research.angleCount > 0 && !options.force) {
    return { skipped: true, research, angles: [], authorProfile: null, usage: null };
  }

  const profile = await (dependencies.loadProfile ?? loadAuthorProfile)();
  const profileHash = hashAuthorProfile(profile.content);
  const config = dependencies.config ?? getAngleGenerationConfig();
  const executeAi = dependencies.executeAi ?? executeAiRequest;
  const sourceIds = research.sources.map((source) => source.id);
  const response = await executeAi({
    feature: ANGLE_GENERATION_FEATURE,
    model: config.model,
    input: buildAngleGenerationPrompt(research, profile.content, config.count),
    maxOutputTokens: config.maxOutputTokens,
    structuredOutput: angleGenerationOutputFormat(sourceIds, config.count),
    reasoningEffort: "medium",
  });
  if (response.usage.webSearchCalls !== 0 || response.webSearchSources.length !== 0) throw new Error("Angle Generation unexpectedly returned Web Search usage.");
  const angles = parseAndValidateAngleOutput(response.outputText, sourceIds, config.count);
  const persisted = await repository.persistGeneration({
    research, angles, model: config.model, authorProfileHash: profileHash,
    generationId: (dependencies.generationId ?? randomUUID)(), generatedAt: (dependencies.now ?? (() => new Date()))(),
  });
  return { skipped: false, research, angles: persisted, authorProfile: { characterCount: profile.characterCount, hash: profileHash }, usage: response.usage };
}

export async function listAngles(researchId: string, repository: AngleRepository = angleRepository): Promise<{ research: AngleResearchSummary; angles: PersistedContentAngle[] }> {
  const id = researchId.trim();
  if (!id) throw new Error("--research-id is required.");
  const research = await repository.findResearch(id);
  if (!research) throw new Error(`TopicResearch not found: ${id}.`);
  validateAngleResearch(research);
  return { research: { id: research.id, topicTitle: research.topic.title }, angles: await repository.list(id) };
}

type AngleResearchSummary = { id: string; topicTitle: string };

export async function selectAngle(angleId: string, repository: AngleRepository = angleRepository): Promise<SelectedContentAngle> {
  const id = angleId.trim();
  if (!id) throw new Error("--angle-id is required.");
  const angle = await repository.select(id);
  if (!angle) throw new Error(`ContentAngle not found: ${id}.`);
  return angle;
}
