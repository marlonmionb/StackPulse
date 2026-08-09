const evidenceReference = (textField: string, sourceIds: readonly string[]) => ({
  type: "object", additionalProperties: false, required: [textField, "sourceIds"],
  properties: {
    [textField]: { type: "string", minLength: 1, maxLength: 700 },
    sourceIds: { type: "array", minItems: 1, maxItems: 10, items: { type: "string", enum: [...sourceIds] } },
  },
});

export function topicResearchOutputFormat(sourceIds: readonly string[]) { return {
  name: "grounded_topic_research",
  description: "A concise engineering research brief whose factual statements cite returned evidence sources.",
  schema: {
    type: "object", additionalProperties: false,
    required: ["summary", "whyItMatters", "keyFindings", "technicalDetails", "tradeoffs", "practicalImplications", "openQuestions", "limitations", "sourceAssessments"],
    properties: {
      summary: { type: "string", minLength: 1, maxLength: 2_000 },
      whyItMatters: { type: "string", minLength: 1, maxLength: 1_500 },
      keyFindings: { type: "array", minItems: 1, maxItems: 10, items: {
        ...evidenceReference("finding", sourceIds),
        required: ["finding", "sourceIds", "confidence"],
        properties: { ...evidenceReference("finding", sourceIds).properties, confidence: { type: "string", enum: ["HIGH", "MEDIUM", "LOW"] } },
      } },
      technicalDetails: { type: "array", maxItems: 10, items: evidenceReference("detail", sourceIds) },
      tradeoffs: { type: "array", maxItems: 8, items: evidenceReference("point", sourceIds) },
      practicalImplications: { type: "array", maxItems: 8, items: evidenceReference("implication", sourceIds) },
      openQuestions: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 500 } },
      limitations: { type: "array", maxItems: 8, items: { type: "string", minLength: 1, maxLength: 500 } },
      sourceAssessments: { type: "array", minItems: sourceIds.length, maxItems: sourceIds.length, items: {
        type: "object", additionalProperties: false, required: ["sourceId", "type"],
        properties: {
          sourceId: { type: "string", enum: [...sourceIds] },
          type: { type: "string", enum: ["PRIMARY", "SECONDARY"] },
        },
      } },
    },
  },
}; }

export const topicResearchEvidenceOutputFormat = {
  name: "topic_research_evidence",
  description: "A bounded research narrative. Source URLs are owned by Web Search provider metadata, not this output.",
  schema: {
    type: "object", additionalProperties: false, required: ["researchNarrative"],
    properties: {
      researchNarrative: { type: "string", minLength: 1, maxLength: 8_000 },
    },
  },
};
