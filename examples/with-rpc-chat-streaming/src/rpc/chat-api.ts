import { load, getEnv } from "defuss-env";
import { createClient, type ChatMessage as OpenAIChatMessage } from "defuss-openai";

load(".env", true, false);

/**
 * ChatApi - Server-side LLM chat via defuss-openai.
 *
 * Uses streaming to yield tokens in real-time, then generates
 * a conversation title after the first assistant response.
 */
export class ChatApi {
	/**
	 * Stream a chat completion. Yields text chunks as they arrive.
	 * The final return value is the full assembled response.
	 */
	async *streamChat(
		messages: Array<{ role: string; content: string }>,
		settings?: {
			baseUrl?: string;
			apiKey?: string;
			model?: string;
			systemPrompt?: string;
			temperature?: number;
			maxTokens?: number;
			topK?: number;
			topP?: number;
			repetitionPenalty?: number;
			presencePenalty?: number;
			enableThinking?: boolean;
		},
	) {
		const baseUrl = settings?.baseUrl || getEnv("CHAT_AI_BASE_URL") || "http://localhost:8430";
		const apiKey = settings?.apiKey ?? getEnv("CHAT_AI_KEY") ?? "";
		const model = settings?.model || getEnv("CHAT_AI_MODEL") || "kyr0/zaya1-base-8b-4bit-MLX";

		console.log("[ChatApi] streamChat config:", {
			baseUrl,
			model,
			hasKey: !!apiKey,
			temperature: settings?.temperature,
			maxTokens: settings?.maxTokens,
			enableThinking: settings?.enableThinking,
		});

		const client = createClient({ baseUrl, apiKey });

		const openaiMessages: OpenAIChatMessage[] = [];

		if (settings?.systemPrompt) {
			openaiMessages.push({ role: "system", content: settings.systemPrompt });
		}

		for (const msg of messages) {
			openaiMessages.push({
				role: msg.role as "user" | "assistant" | "system",
				content: msg.content,
			});
		}

		try {
			const streamParams = {
				model,
				messages: openaiMessages,
				temperature: settings?.temperature ?? 0.5,
				max_tokens: settings?.maxTokens ?? 8192,
				top_k: settings?.topK ?? 20,
				top_p: settings?.topP ?? 0.9,
				repetition_penalty: settings?.repetitionPenalty ?? 1,
				presence_penalty: settings?.presencePenalty ?? 0,
				chat_template_kwargs: { enable_thinking: settings?.enableThinking ?? false },
			};

			console.log("[ChatApi] streamChatCompletion params:", JSON.stringify(streamParams, null, 2));

			const stream = await client.streamChatCompletion(streamParams);

			console.log("[ChatApi] stream obtained, reading...");

			const reader = stream.getReader();
			let full = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const content = value.choices?.[0]?.delta?.content;
				if (content) {
					full += content;
					process.stdout.write(content);
					yield content;
				}
			}

			if (full) {
				process.stdout.write("\n");
			}

			return full;
		} catch (err: any) {
			console.error("[ChatApi] streamChat ERROR:", err);
			const errorMsg = `Error: ${err.message || "Failed to connect to LLM API"}`;
			yield errorMsg;
			return errorMsg;
		}
	}

	/**
	 * Generate a short title for a conversation based on the first user message and assistant response.
	 */
	async generateTitle(
		userMessage: string,
		assistantResponse: string,
		settings?: {
			baseUrl?: string;
			apiKey?: string;
			model?: string;
		},
	): Promise<string> {
		const baseUrl = settings?.baseUrl || getEnv("CHAT_AI_BASE_URL") || "http://localhost:8430";
		const apiKey = settings?.apiKey ?? getEnv("CHAT_AI_KEY") ?? "";
		const model = settings?.model || getEnv("CHAT_AI_MODEL") || "kyr0/zaya1-base-8b-4bit-MLX";

		const client = createClient({ baseUrl, apiKey });

		try {
			const result = await client.createChatCompletion({
				model,
				messages: [
					{
						role: "system",
						content: "Generate a very short title (max 6 words) for this conversation. Reply with ONLY the title, no quotes or punctuation at the end.",
					},
					{
						role: "user",
						content: `User: ${userMessage.slice(0, 200)}\nAssistant: ${assistantResponse.slice(0, 200)}`,
					},
				],
				temperature: 0.3,
				max_tokens: 20,
			});

			return result.choices?.[0]?.message?.content?.trim() || userMessage.slice(0, 50);
		} catch {
			return userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : "");
		}
	}

	async ping() {
		return "pong";
	}
}
