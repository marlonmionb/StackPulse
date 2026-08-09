import { CONTENT_KIND_CONFIDENCES, CONTENT_KINDS } from "./constants";

export function contentKindOutputFormat(inputIds: readonly string[]) {
  const classificationSchema = {
    type: "object",
    additionalProperties: false,
    required: ["contentKind", "confidence", "reason"],
    properties: {
      contentKind: { type: "string", enum: [...CONTENT_KINDS] },
      confidence: { type: "string", enum: [...CONTENT_KIND_CONFIDENCES] },
      reason: { type: "string", minLength: 1, maxLength: 180 },
    },
  };
  return {
    name: "content_kind_batch",
    description: "One editorial/source-nature classification per SourceItem.",
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["classifications"],
      properties: {
        classifications: {
          type: "object",
          additionalProperties: false,
          required: [...inputIds],
          properties: Object.fromEntries(inputIds.map((id) => [id, classificationSchema])),
        },
      },
    },
  };
}
