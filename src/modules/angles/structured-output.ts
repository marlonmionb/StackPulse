import { ANGLE_TEXT_LIMITS, AUTHOR_CONNECTION_TYPES } from "./constants";

export function angleGenerationOutputFormat(sourceIds: readonly string[], count: number) {
  return {
    name: "content_angle_candidates",
    description: "Distinct grounded editorial plans, not publishable post prose.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["angles"],
      properties: {
        angles: {
          type: "array",
          minItems: count,
          maxItems: count,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "thesis", "authorConnectionType", "whyItFitsAuthor", "supportingSourceIds", "fitScore", "requiresHumanInput", "humanInputPrompt", "claimBoundaryNotes"],
            properties: {
              title: { type: "string", minLength: 1, maxLength: ANGLE_TEXT_LIMITS.title },
              thesis: { type: "string", minLength: 1, maxLength: ANGLE_TEXT_LIMITS.thesis },
              authorConnectionType: { type: "string", enum: [...AUTHOR_CONNECTION_TYPES] },
              whyItFitsAuthor: { type: "string", minLength: 1, maxLength: ANGLE_TEXT_LIMITS.whyItFitsAuthor },
              supportingSourceIds: { type: "array", minItems: 1, maxItems: sourceIds.length, items: { type: "string", enum: [...sourceIds] } },
              fitScore: { type: "integer", minimum: 0, maximum: 10 },
              requiresHumanInput: { type: "boolean" },
              humanInputPrompt: { anyOf: [{ type: "string", minLength: 1, maxLength: ANGLE_TEXT_LIMITS.humanInputPrompt }, { type: "null" }] },
              claimBoundaryNotes: { type: "string", minLength: 1, maxLength: ANGLE_TEXT_LIMITS.claimBoundaryNotes },
            },
          },
        },
      },
    },
  };
}
