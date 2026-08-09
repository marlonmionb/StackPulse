import OpenAI from "openai";

export type AiProviderResponse = {
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  webSearchCalls: number;
  totalTokens: number;
  webSearchSources: AiWebSearchSource[];
};

export type AiWebSearchSource = { url: string; title: string | null };

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

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

/**
 * Extracts only provider-owned Web Search metadata. Ordinary URLs in output
 * text are deliberately ignored. URL citations are API annotations for web
 * resources used by the response, so they may supplement the complete search
 * action source list and provide titles.
 */
export function extractWebSearchResponse(output: readonly unknown[]): {
  outputText: string; webSearchCalls: number; webSearchSources: AiWebSearchSource[];
} {
  const sources = new Map<string, AiWebSearchSource>();
  const addSource = (url: unknown, title: unknown = null) => {
    if (typeof url !== "string") return;
    const normalizedTitle = typeof title === "string" && title.trim() ? title.trim() : null;
    const current = sources.get(url);
    sources.set(url, { url, title: current?.title ?? normalizedTitle });
  };
  let webSearchCalls = 0;
  let outputText = "";
  for (const rawItem of output) {
    const item = record(rawItem);
    if (!item) continue;
    if (item.type === "web_search_call") {
      webSearchCalls += 1;
      const action = record(item.action);
      if (action?.type === "search" && Array.isArray(action.sources)) {
        for (const rawSource of action.sources) {
          const source = record(rawSource);
          if (source?.type === "url") addSource(source.url);
        }
      }
    }
    if (item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const rawContent of item.content) {
      const content = record(rawContent);
      if (content?.type !== "output_text" || typeof content.text !== "string") continue;
      outputText += content.text;
      if (!Array.isArray(content.annotations)) continue;
      for (const rawAnnotation of content.annotations) {
        const annotation = record(rawAnnotation);
        if (annotation?.type === "url_citation") addSource(annotation.url, annotation.title);
      }
    }
  }
  return { outputText, webSearchCalls, webSearchSources: [...sources.values()] };
}

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

      const extracted = extractWebSearchResponse(response.output);

      return {
        outputText: extracted.outputText,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        reasoningTokens: response.usage.output_tokens_details.reasoning_tokens,
        webSearchCalls: extracted.webSearchCalls,
        totalTokens: response.usage.total_tokens,
        webSearchSources: extracted.webSearchSources,
      };
    },
  };
}
