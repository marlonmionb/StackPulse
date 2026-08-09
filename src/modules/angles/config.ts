import {
  DEFAULT_ANGLE_GENERATION_COUNT,
  DEFAULT_ANGLE_GENERATION_MAX_OUTPUT_TOKENS,
  DEFAULT_ANGLE_GENERATION_MODEL,
  MAX_ANGLE_GENERATION_COUNT,
  MIN_ANGLE_GENERATION_COUNT,
} from "./constants";

export type AngleGenerationConfig = { model: string; maxOutputTokens: number; count: number };
type AngleEnvironment = Record<string, string | undefined>;

function integer(env: AngleEnvironment, name: string, fallback: number, minimum: number, maximum: number): number {
  const raw = env[name]?.trim();
  const value = raw ? Number(raw) : fallback;
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

export function getAngleGenerationConfig(env: AngleEnvironment = process.env): AngleGenerationConfig {
  const model = env.OPENAI_ANGLE_GENERATION_MODEL?.trim() || DEFAULT_ANGLE_GENERATION_MODEL;
  return {
    model,
    maxOutputTokens: integer(env, "ANGLE_GENERATION_MAX_OUTPUT_TOKENS", DEFAULT_ANGLE_GENERATION_MAX_OUTPUT_TOKENS, 1, 5_000),
    count: integer(env, "ANGLE_GENERATION_COUNT", DEFAULT_ANGLE_GENERATION_COUNT, MIN_ANGLE_GENERATION_COUNT, MAX_ANGLE_GENERATION_COUNT),
  };
}
