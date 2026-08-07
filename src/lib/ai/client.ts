import OpenAI from "openai";

export type AiProviderResponse = {
  outputText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
};

export type AiProvider = {
  createResponse(request: {
    model: string;
    input: string;
    maxOutputTokens: number;
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
      const response = await getOpenAiClient(apiKey).responses.create({
        model: request.model,
        input: request.input,
        max_output_tokens: request.maxOutputTokens,
      });

      if (!response.usage) {
        throw new Error("OpenAI response did not include token usage.");
      }

      return {
        outputText: response.output_text,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.total_tokens,
      };
    },
  };
}
