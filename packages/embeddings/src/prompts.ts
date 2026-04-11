import type { QueryEmbedOptions, QueryInstructionPreset } from "./types.js";

export const QUERY_INSTRUCTION_PRESETS: Record<QueryInstructionPreset, string> = {
  web_search_query:
    "Given a web search query, retrieve relevant passages that answer the query",
  sts_query: "Retrieve semantically similar text",
  bitext_query: "Retrieve parallel sentences",
};

export const DEFAULT_QUERY_INSTRUCTION_PRESET: QueryInstructionPreset = "web_search_query";

export const resolveQueryInstruction = (options: QueryEmbedOptions = {}): string => {
  if (options.instruction !== undefined) {
    return options.instruction.trim();
  }

  const preset = options.preset ?? DEFAULT_QUERY_INSTRUCTION_PRESET;
  return QUERY_INSTRUCTION_PRESETS[preset];
};

export const formatInstructionQuery = (
  query: string,
  options: QueryEmbedOptions = {},
): string => {
  const trimmedQuery = query.trim();
  if (trimmedQuery.startsWith("Instruct: ") && trimmedQuery.includes("\nQuery: ")) {
    return trimmedQuery;
  }

  const instruction = resolveQueryInstruction(options);
  if (instruction.length === 0) {
    return trimmedQuery;
  }

  return `Instruct: ${instruction}\nQuery: ${trimmedQuery}`;
};