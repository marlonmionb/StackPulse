import { TOPIC_RESEARCH_MAX_SOURCES } from "./constants";

const evidenceReference = (textField: string) => ({
  type: "object", additionalProperties: false, required: [textField, "sourceIds"],
  properties: {
    [textField]: { type: "string", minLength: 1, maxLength: 700 },
    sourceIds: { type: "array", minItems: 1, maxItems: 10, items: { type: "string" } },
  },
});

export const topicResearchOutputFormat = {
  name: "grounded_topic_research",
  description: "A concise engineering research brief whose factual statements cite returned evidence sources.",
  schema: {
    type: "object", additionalProperties: false,
    required: ["summary", "whyItMatters", "keyFindings", "technicalDetails", "tradeoffs", "practicalImplications", "openQuestions", "limitations", "sources"],
    properties: {
      summary: { type: "string", minLength: 1, maxLength: 2_000 },
      whyItMatters: { type: "string", minLength: 1, maxLength: 1_500 },
      keyFindings: { type: "array", minItems: 1, maxItems: 10, items: {
        ...evidenceReference("finding"),
        required: ["finding", "sourceIds", "confidence"],
        properties: { ...evidenceReference("finding").properties, confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] } },
      } },
      technicalDetails: { type: "array", maxItems: 10, items: evidenceReference("detail") },
      tradeoffs: { type: "array", maxItems: 8, items: evidenceReference("point") },
      practicalImplications: { type: "array", maxItems: 8, items: evidenceReference("implication") },
      openQuestions: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 500 } },
      limitations: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 500 } },
      sources: { type: "array", minItems: 1, maxItems: TOPIC_RESEARCH_MAX_SOURCES, items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "url", "publisher", "publishedAt", "type"],
        properties: {
          id: { type: "string", minLength: 1, maxLength: 40 }, title: { type: "string", minLength: 1, maxLength: 300 },
          url: { type: "string", minLength: 8, maxLength: 2_000 },
          publisher: { type: ["string", "null"], maxLength: 200 },
          publishedAt: { type: ["string", "null"] }, type: { type: "string", enum: ["PRIMARY", "SECONDARY"] },
        },
      } },
    },
  },
};
