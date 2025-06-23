export interface EmbeddingParams {
  model?: string;
  input: string | string[];
}

export interface ConfigOpts {
  baseURL?: string;
  apiKey?: string;
}

export interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export const openAIEmbed = async (
  params: EmbeddingParams,
  apiOptions: ConfigOpts = {},
): Promise<EmbeddingResponse> => {
  const model = params.model || "text-embedding-qwen3-embedding-8b";
  const baseURL = apiOptions.baseURL || "http://127.0.0.1:1234/v1";
  
  const response = await fetch(`${baseURL}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: params.input
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};
