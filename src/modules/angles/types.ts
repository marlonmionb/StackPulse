import type { AiExecutionUsage } from "@/lib/ai";

export type AuthorConnectionType =
  | "PROFESSIONAL_EXPERIENCE"
  | "PERSONAL_PROJECT"
  | "LEARNING_EXPLORATION"
  | "TECHNICAL_ONLY";

export type ResearchEvidenceReference = { text: string; sourceIds: string[] };
export type AngleResearchSource = {
  id: string;
  databaseId: string;
  title: string;
  publisher: string | null;
  domain: string;
  type: "PRIMARY" | "SECONDARY";
};
export type AngleResearch = {
  id: string;
  topic: { id: string; title: string; description: string | null };
  summary: string;
  whyItMatters: string;
  keyFindings: unknown;
  technicalDetails: unknown;
  tradeoffs: unknown;
  practicalImplications: unknown;
  openQuestions: unknown;
  limitations: unknown;
  sources: AngleResearchSource[];
  angleCount: number;
};

export type ValidatedContentAngle = {
  title: string;
  thesis: string;
  authorConnectionType: AuthorConnectionType;
  whyItFitsAuthor: string;
  supportingSourceIds: string[];
  fitScore: number;
  requiresHumanInput: boolean;
  humanInputPrompt: string | null;
  claimBoundaryNotes: string;
};

export type PersistedContentAngle = ValidatedContentAngle & {
  id: string;
  topicResearchId: string;
  generationId: string;
  authorProfileHash: string;
  status: "GENERATED" | "SELECTED";
  model: string;
  generatedAt: Date;
};

export type SelectedContentAngle = PersistedContentAngle & { researchTitle: string };

export type AngleGenerationResult = {
  skipped: boolean;
  research: AngleResearch;
  angles: PersistedContentAngle[];
  authorProfile: { characterCount: number; hash: string } | null;
  usage: AiExecutionUsage | null;
};
