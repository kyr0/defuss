export type MessageRole = "user" | "assistant" | "system";

export interface CallTraceEntry {
  type: "evaluator" | "strategy";
  name: string;
  params: Record<string, unknown>;
  result?: Record<string, unknown>;
}

export interface AssistantMessageMeta {
  model: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  topP: number;
  repetitionPenalty: number;
  presencePenalty: number;
  enableThinking: boolean;
  callTrace?: CallTraceEntry[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  meta?: AssistantMessageMeta;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatSettings {
  baseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  topP: number;
  repetitionPenalty: number;
  presencePenalty: number;
  enableThinking: boolean;
  devMode: boolean;
}

export const DEFAULT_CHAT_SETTINGS: ChatSettings = {
  baseUrl: "http://localhost:8430",
  apiKey: "",
  model: "kyr0/zaya1-base-8b-4bit-MLX",
  systemPrompt: "You are a helpful assistant.",
  temperature: 0.5,
  maxTokens: 8192,
  topK: 20,
  topP: 0.9,
  repetitionPenalty: 1,
  presencePenalty: 0,
  enableThinking: false,
  devMode: false,
};
