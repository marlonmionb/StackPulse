import OpenAI from "openai";

export type AiProviderResponse = {
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
  totalTokens: number;
  groundedUrls: string[];
};

export type AiStructuredOutput = {
  name: string;
  description?: string;
  schema: Record<string, unknown>;
};

export type AiProvider = {
  createResponse(request: {
    model: string;
    input: string;
    maxOutputTokens: number;
    structuredOutput?: AiStructuredOutput;
    reasoningEffort?: "low" | "medium" | "high";
    webSearch?: { maxCalls: number; searchContextSize?: "low" | "medium" | "high" };
  }): Promise<AiProviderResponse>;
};

let client: OpenAI | undefined;

function getOpenAiClient(apiKey: string): OpenAI {
  client ??= new OpenAI({ apiKey });
  return client;
}

export function createOpenAiProvider(apiKey: string): AiProvider {
  return {
    async createResponse(request) {
      // SDK 7.4 exposes the API-native max_tool_calls bound on its beta Responses
      // surface; keep that version-specific detail isolated here.
      const response = await getOpenAiClient(apiKey).beta.responses.create({
        model: request.model,
        input: request.input,
        max_output_tokens: request.maxOutputTokens,
        reasoning: request.reasoningEffort
          ? { effort: request.reasoningEffort }
          : undefined,
        tools: request.webSearch
          ? [{ type: "web_search", search_context_size: request.webSearch.searchContextSize ?? "medium" }]
          : undefined,
        tool_choice: request.webSearch ? "required" : undefined,
        max_tool_calls: request.webSearch?.maxCalls,
        include: request.webSearch
          ? ["web_search_call.action.sources"]
          : undefined,
        text: request.structuredOutput
          ? {
              format: {
                type: "json_schema",
                name: request.structuredOutput.name,
                description: request.structuredOutput.description,
                schema: request.structuredOutput.schema,
                strict: true,
              },
            }
          : undefined,
      });

      if (!response.usage) {
        throw new Error("OpenAI response did not include token usage.");
      }

      const groundedUrls = new Set<string>();
      let webSearchCalls = 0;
      let outputText = "";
      for (const item of response.output) {
        if (item.type === "web_search_call") {
          webSearchCalls += 1;
          if (item.action.type === "search") {
            item.action.sources?.forEach((source) => groundedUrls.add(source.url));
          } else if (item.action.url) {
            groundedUrls.add(item.action.url);
          }
        }
        if (item.type === "message") {
          for (const content of item.content) {
            if (content.type === "output_text") {
              outputText += content.text;
              for (const annotation of content.annotations) {
                if (annotation.type === "url_citation") groundedUrls.add(annotation.url);
              }
            }
          }
        }
      }

      return {
        outputText,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        reasoningTokens: response.usage.output_tokens_details.reasoning_tokens,
        webSearchCalls,
        totalTokens: response.usage.total_tokens,
        groundedUrls: [...groundedUrls],
      };
    },
  };
}
