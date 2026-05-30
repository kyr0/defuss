import { load, getEnv } from "defuss-env";
import {
	OCR_DEFAULT_PROMPT,
	OCR_DEFAULT_MODEL,
	OCR_MAX_TOKENS,
} from "../ocr.config.js";

// Load .env once at module level (won't override existing process.env values)
load(".env", true, false);

/**
 * OCR API — Server-side document processing via OpenAI-compatible vision endpoint.
 *
 * Accepts a document (PDF or image) as base64, sends it directly as a
 * data-URI to a GLM-OCR-compatible v1/chat/completions endpoint.
 * The endpoint handles PDF pages natively — no client-side conversion needed.
 * Returns markdown text and optional layout regions.
 */

export interface OcrPage {
	regions?: Array<Record<string, unknown>>;
	[key: string]: unknown;
}

export interface OcrResult {
	success: boolean;
	markdown?: string;
	error?: string;
	pages?: OcrPage[];
	totalRegions?: number;
	rawResponse?: Record<string, unknown>;
}

export class OcrApi {
	public async processDocument(
		fileBase64: string,
		_fileName: string,
		mimeType: string,
		prompt: string,
	): Promise<OcrResult> {
		const endpoint = getEnv("OCR_AI_ENDPOINT");
		const apiKey = getEnv("OCR_AI_KEY");
		const model = getEnv("OCR_AI_MODEL") || OCR_DEFAULT_MODEL;

		console.log("Processing document with OCR API:", {
			endpoint,
			apiKey,
			mimeType,
			prompt: prompt.trim() ? "[custom prompt]" : "[default prompt]",
			model,
		});

		if (!endpoint) {
			return {
				success: false,
				error: "OCR_AI_ENDPOINT not configured on server",
			};
		}

		if (!apiKey) {
			return { success: false, error: "OCR_AI_KEY not configured on server" };
		}

		try {
			const dataUrl = `data:${mimeType};base64,${fileBase64}`;

			const systemPrompt = prompt.trim() ? prompt : OCR_DEFAULT_PROMPT;

			const completionUrl = `${endpoint.replace(/\/+$/, "")}/v1/chat/completions`;

			const response = await fetch(completionUrl, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages: [
						{
							role: "user",
							content: [
								{ type: "text", text: systemPrompt },
								{ type: "image_url", image_url: { url: dataUrl } },
							],
						},
					],
					max_tokens: OCR_MAX_TOKENS,
				}),
			});

			if (!response.ok) {
				const errorText = await response.text();
				console.error("OCR API error:", response.status, errorText);
				return {
					success: false,
					error: `OCR API returned ${response.status}: ${errorText.slice(0, 200)}`,
				};
			}

			const data = (await response.json()) as {
				choices?: Array<{ message?: { content?: string } }>;
				pages?: OcrPage[];
			};

			const markdown = data.choices?.[0]?.message?.content || "";
			const pages = data.pages || [];
			const totalRegions = pages.reduce(
				(n, page) => n + (page.regions?.length || 0),
				0,
			);

			if (!markdown) {
				return {
					success: false,
					error: "No text content returned from OCR endpoint",
				};
			}

			return {
				success: true,
				markdown,
				pages: pages.length > 0 ? pages : undefined,
				totalRegions,
				rawResponse: data,
			};
		} catch (error) {
			console.error("OCR processing error:", error);
			const message =
				error instanceof Error ? error.message : "Unknown processing error";
			return { success: false, error: message };
		}
	}
}
