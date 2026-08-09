export const ANGLE_GENERATION_FEATURE = "angle-generation";
export const DEFAULT_ANGLE_GENERATION_MODEL = "gpt-5.6-terra";
export const DEFAULT_ANGLE_GENERATION_MAX_OUTPUT_TOKENS = 2_500;
export const DEFAULT_ANGLE_GENERATION_COUNT = 4;
export const MIN_ANGLE_GENERATION_COUNT = 3;
export const MAX_ANGLE_GENERATION_COUNT = 5;

export const ANGLE_TEXT_LIMITS = {
  title: 100,
  thesis: 600,
  whyItFitsAuthor: 500,
  humanInputPrompt: 300,
  claimBoundaryNotes: 400,
} as const;

export const AUTHOR_CONNECTION_TYPES = [
  "PROFESSIONAL_EXPERIENCE",
  "PERSONAL_PROJECT",
  "LEARNING_EXPLORATION",
  "TECHNICAL_ONLY",
] as const;
