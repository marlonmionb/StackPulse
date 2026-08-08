export function topicDiscoveryOutputFormat(maxTopics: number) {
  return {
    name: "topic_discovery",
    description: "A bounded ranked list of technical content opportunities supported by supplied SourceItems.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["topics"],
      properties: {
        topics: {
          type: "array",
          maxItems: maxTopics,
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "title", "description", "overallScore", "profileRelevanceScore",
              "technicalDepthScore", "freshnessScore", "contentPotentialScore",
              "rankingReason", "sourceItemIds",
            ],
            properties: {
              title: { type: "string", minLength: 1, maxLength: 140 },
              description: { type: "string", minLength: 1, maxLength: 400 },
              overallScore: { type: "number", minimum: 0, maximum: 10 },
              profileRelevanceScore: { type: "number", minimum: 0, maximum: 10 },
              technicalDepthScore: { type: "number", minimum: 0, maximum: 10 },
              freshnessScore: { type: "number", minimum: 0, maximum: 10 },
              contentPotentialScore: { type: "number", minimum: 0, maximum: 10 },
              rankingReason: { type: "string", minLength: 1, maxLength: 240 },
              sourceItemIds: {
                type: "array", minItems: 1, items: { type: "string" },
              },
            },
          },
        },
      },
    },
  };
}
