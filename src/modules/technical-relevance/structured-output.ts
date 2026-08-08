import { TECHNICAL_CATEGORIES } from "./constants";

export function technicalRelevanceOutputFormat(itemCount: number) {
  return {
    name: "technical_relevance_batch",
    description: "One software-engineering relevance classification per input item.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["classifications"],
      properties: {
        classifications: {
          type: "array",
          minItems: itemCount,
          maxItems: itemCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "sourceItemId",
              "relevant",
              "relevanceScore",
              "category",
              "reason",
            ],
            properties: {
              sourceItemId: { type: "string" },
              relevant: { type: "boolean" },
              relevanceScore: { type: "integer", minimum: 0, maximum: 10 },
              category: { type: "string", enum: [...TECHNICAL_CATEGORIES] },
              reason: { type: "string", maxLength: 180 },
            },
          },
        },
      },
    },
  };
}
