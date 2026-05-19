import { $, createRef, render } from "defuss";
import { Button } from "defuss-shadcn";
import { updateWithMarkdown } from "defuss-markdown";
import {
	chatStore,
	getActiveConversation,
	createConversation,
	addMessage,
	updateMessageContent,
	updateConversationTitle,
	saveConversationsToStorage,
} from "../../lib/chat-store";
import { getRpcClient } from "../../lib/rpc-client";
import { setStreamRendering, scrollToBottomForce, setShouldAutoScroll, shouldAutoScrollGet } from "./message-list";
import { t } from "../../i18n";

// Module-level resend handler (avoids closure issues and duplicate listeners)
let sendBtnRef: HTMLButtonElement | null = null;

// Module-level AbortController for canceling active streaming
let activeStreamAbort: AbortController | null = null;

async function streamResponseForConversation(conversationId: string) {
	chatStore.set({ ...chatStore.value, isStreaming: true });
	setShouldAutoScroll(true);

	const sendBtn = sendBtnRef;
	if (sendBtn) sendBtn.disabled = true;

	// Create abort controller for this streaming operation
	activeStreamAbort = new AbortController();
	const { signal } = activeStreamAbort;

	try {
		const rpc = await getRpcClient();
		const chatApi = new rpc.ChatApi();

		const currentConv = chatStore.value.conversations.find((c) => c.id === conversationId);
		const apiMessages = (currentConv?.messages || [])
			.filter((m) => m.role !== "assistant" || m.content)
			.map((m) => ({ role: m.role, content: m.content }));

		const settings = chatStore.value.settings;

		const stream = chatApi.streamChat(apiMessages, {
			baseUrl: settings.baseUrl || undefined,
			apiKey: settings.apiKey || undefined,
			model: settings.model || undefined,
			systemPrompt: settings.systemPrompt || undefined,
			temperature: settings.temperature,
			maxTokens: settings.maxTokens,
			topK: settings.topK,
			topP: settings.topP,
			repetitionPenalty: settings.repetitionPenalty,
			presencePenalty: settings.presencePenalty,
			enableThinking: settings.enableThinking,
		});

		const assistantMsgId = addMessage(conversationId, "assistant", "", {
			model: settings.model,
			temperature: settings.temperature,
			maxTokens: settings.maxTokens,
			topK: settings.topK,
			topP: settings.topP,
			repetitionPenalty: settings.repetitionPenalty,
			presencePenalty: settings.presencePenalty,
			enableThinking: settings.enableThinking,
		});
		setStreamRendering(assistantMsgId);

		const contentEl = document.querySelector<HTMLElement>(`[data-msg-id="${assistantMsgId}"]`);
		if (contentEl) {
			const loadingEl = document.querySelector<HTMLElement>(`[data-msg-loading="${assistantMsgId}"]`);
			const timestampEl = document.querySelector<HTMLElement>(`[data-msg-time="${assistantMsgId}"]`);
			let hasRenderedFirstToken = false;

			const thinkingTimeout = settings.enableThinking
				? setTimeout(() => {
					if (!hasRenderedFirstToken && contentEl) {
						contentEl.textContent = t("chat.thinking");
						contentEl.classList.remove("hidden");
					}
				}, 1500)
				: null;

			const revealStreamingMessage = () => {
				if (hasRenderedFirstToken) return;
				hasRenderedFirstToken = true;
				if (thinkingTimeout) clearTimeout(thinkingTimeout);
				loadingEl?.classList.add("hidden");
				contentEl.classList.remove("hidden");
				timestampEl?.classList.remove("hidden");
			};

			// Use async generator to stream chunks through a single parser
			const batchedStream = async function* () {
				let fullResponse = "";
				for await (const chunk of stream) {
					if (signal.aborted) break;
					const text = typeof chunk === "string" ? chunk : (chunk as any).delta?.content || "";
					if (text) {
						fullResponse += text;
						revealStreamingMessage();
						updateMessageContent(conversationId, assistantMsgId, fullResponse);
						yield text;
					}
				}
			};

			try {
				await updateWithMarkdown(contentEl, batchedStream(), { render });
			} catch (err: any) {
				if (signal.aborted) {
					console.log("[ChatInput] streaming cancelled by user");
				} else {
					throw err;
				}
			} finally {
				if (thinkingTimeout) clearTimeout(thinkingTimeout);
			}
		}
	} catch (error) {
		if (signal.aborted) {
			// User cancelled - don't show error
		} else {
			console.error("[ChatInput] stream error:", error);
		}
	} finally {
		setStreamRendering(null);
		chatStore.set({ ...chatStore.value, isStreaming: false });
		activeStreamAbort = null;
	}
}

window.addEventListener("chat:resend", (e: Event) => {
	const { conversationId } = (e as CustomEvent).detail;
	if (conversationId) {
		streamResponseForConversation(conversationId);
	}
});

export function ChatInput() {
	const textareaRef = createRef<HTMLTextAreaElement>();
	const sendBtnRef = createRef<HTMLButtonElement>();
	const buttonContainerRef = createRef<HTMLDivElement>();

	const autoResize = () => {
		const el = textareaRef.current;
		if (el) {
			el.style.height = "auto";
			el.style.height = Math.min(el.scrollHeight, 200) + "px";
		}
	};

	const renderButton = () => {
	  if (chatStore.value.isStreaming) {
	    $(buttonContainerRef).jsx(
	      <Button
	        type="button"
	        size="icon"
	        variant="destructive"
	        className="size-11 shrink-0 rounded-xl"
	        onClick={handleStop}
	        aria-label={t("chat.stop_generating")}
	        title={t("chat.stop_generating")}
	      >
	        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" /></svg>
	      </Button>,
	    );
	  } else {
			$(buttonContainerRef).jsx(
				<Button
					ref={sendBtnRef}
					type="button"
					size="icon"
					className="size-11 shrink-0 rounded-xl"
					onClick={handleSend}
					aria-label={t("chat.send_message")}
					title={t("chat.send_message")}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" /><path d="m21.854 2.147-10.94 10.939" /></svg>
				</Button>,
			);
		}
	};

	chatStore.subscribe(renderButton);

	const handleSend = async () => {
		const textarea = textareaRef.current;
		if (!textarea) return;

		const content = textarea.value.trim();
		if (!content) return;

		// If no active conversation, create one
		let conv = getActiveConversation();
		if (!conv) {
			conv = createConversation();
		}

		const conversationId = conv.id;
		const isFirstMessage = conv.messages.length === 0;

		// Add user message
		addMessage(conversationId, "user", content);

		// Scroll to bottom after sending message
		requestAnimationFrame(scrollToBottomForce);

		// Clear input
		textarea.value = "";
		textarea.style.height = "auto";

		// Add placeholder assistant message
		const settings = chatStore.value.settings;
		const assistantMsgId = addMessage(conversationId, "assistant", "", {
			model: settings.model,
			temperature: settings.temperature,
			maxTokens: settings.maxTokens,
			topK: settings.topK,
			topP: settings.topP,
			repetitionPenalty: settings.repetitionPenalty,
			presencePenalty: settings.presencePenalty,
			enableThinking: settings.enableThinking,
		});
		chatStore.set({ ...chatStore.value, isStreaming: true });
		setShouldAutoScroll(true);

		// Create abort controller for this streaming operation
		activeStreamAbort = new AbortController();
		const { signal } = activeStreamAbort;

		let fullResponse = "";

		try {
			const rpc = await getRpcClient();
			const chatApi = new rpc.ChatApi();

			// Build messages array for the API
			const currentConv = chatStore.value.conversations.find((c) => c.id === conversationId);
			const apiMessages = (currentConv?.messages || [])
				.filter((m) => m.role !== "assistant" || m.content)
				.filter((m) => m.id !== assistantMsgId)
				.map((m) => ({ role: m.role, content: m.content }));

			const settings = chatStore.value.settings;

			console.log("[ChatInput] calling streamChat with settings:", {
				baseUrl: settings.baseUrl,
				model: settings.model,
				enableThinking: settings.enableThinking,
				maxTokens: settings.maxTokens,
			});

			const stream = chatApi.streamChat(apiMessages, {
				baseUrl: settings.baseUrl || undefined,
				apiKey: settings.apiKey || undefined,
				model: settings.model || undefined,
				systemPrompt: settings.systemPrompt || undefined,
				temperature: settings.temperature,
				maxTokens: settings.maxTokens,
				topK: settings.topK,
				topP: settings.topP,
				repetitionPenalty: settings.repetitionPenalty,
				presencePenalty: settings.presencePenalty,
				enableThinking: settings.enableThinking,
			});

			console.log("[ChatInput] stream obtained, iterating...");

			const contentEl = document.querySelector<HTMLElement>(`[data-msg-id="${assistantMsgId}"]`);
			if (contentEl) {
				const loadingEl = document.querySelector<HTMLElement>(`[data-msg-loading="${assistantMsgId}"]`);
				const timestampEl = document.querySelector<HTMLElement>(`[data-msg-time="${assistantMsgId}"]`);
				let hasRenderedFirstToken = false;

				// When thinking is enabled, show "Thinking..." after 1.5s if no content yet
				const thinkingTimeout = settings.enableThinking
					? setTimeout(() => {
						if (!hasRenderedFirstToken && contentEl) {
							contentEl.textContent = t("chat.thinking");
							contentEl.classList.remove("hidden");
						}
					}, 1500)
					: null;

				const revealStreamingMessage = () => {
					if (hasRenderedFirstToken) return;
					hasRenderedFirstToken = true;
					if (thinkingTimeout) clearTimeout(thinkingTimeout);
					loadingEl?.classList.add("hidden");
					contentEl.classList.remove("hidden");
					timestampEl?.classList.remove("hidden");
				};

				// Batch RPC chunks between animation frames for smoother rendering
				const batchedStream = async function* () {
					let pending = "";
					let resolve: (() => void) | null = null;

					const flush = () => {
						if (resolve) resolve();
					};

					for await (const chunk of stream) {
						if (signal.aborted) break;
						fullResponse += chunk;
						pending += chunk;

						if (!resolve) {
							const wait = new Promise<void>((r) => { resolve = r; });
							requestAnimationFrame(flush);
							await wait;

							const batch = pending;
							pending = "";
							resolve = null;

							if (batch) {
								revealStreamingMessage();
								yield batch;
							}
						}
					}

					// Flush any remaining content
					if (pending) {
						revealStreamingMessage();
						yield pending;
					}
				};

				setStreamRendering(assistantMsgId);
					const scrollInterval = setInterval(() => {
						if (!shouldAutoScrollGet()) return;
						const container = contentEl.closest(".chat-messages");
						if (container) {
							container.scrollTop = container.scrollHeight;
						}
					}, 100);

				try {
					await updateWithMarkdown(contentEl, batchedStream(), { render });
				} catch (err: any) {
					if (signal.aborted) {
						// User cancelled - don't show error
						console.log("[ChatInput] streaming cancelled by user");
					} else {
						throw err;
					}
				} finally {
					clearInterval(scrollInterval);
					setStreamRendering(null);
				}
			} else {
				for await (const chunk of stream) {
					fullResponse += chunk;
				}
			}

			updateMessageContent(conversationId, assistantMsgId, fullResponse);

			saveConversationsToStorage();
		} catch (err: any) {
			if (signal.aborted) {
				// User cancelled - don't show error
			} else {
				updateMessageContent(conversationId, assistantMsgId, `Error: ${err.message || "Failed to get response"}`);
			}
		} finally {
			chatStore.set({ ...chatStore.value, isStreaming: false });
			activeStreamAbort = null;
			textarea?.focus();
		}

		// Generate title after first message exchange (fire-and-forget, don't block UI)
		if (isFirstMessage && fullResponse && !fullResponse.startsWith("Error:")) {
			(async () => {
				try {
					const rpc = await getRpcClient();
					const chatApi = new rpc.ChatApi();
					const title = await chatApi.generateTitle(content, fullResponse, {
						baseUrl: settings.baseUrl || undefined,
						apiKey: settings.apiKey || undefined,
						model: settings.model || undefined,
					});
					updateConversationTitle(conversationId, title);
					saveConversationsToStorage();
				} catch {
					// Keep default title
				}
			})();
		}
	};

	const handleStop = async () => {
		// Cancel client-side streaming
		if (activeStreamAbort) {
			activeStreamAbort.abort();
		}

		// Cancel server-side inference via RPC
		try {
			const rpc = await getRpcClient();
			const chatApi = new rpc.ChatApi();
			await chatApi.cancelInference();
		} catch {
			// Ignore RPC errors on cancel
		}

		chatStore.set({ ...chatStore.value, isStreaming: false });
		activeStreamAbort = null;
	};

	const handleKeyDown = (e: Event) => {
		const ke = e as KeyboardEvent;
		if (ke.key === "Enter" && !ke.shiftKey) {
			ke.preventDefault();
			handleSend();
		}
	};

	return (
		<div class="chat-input-area border-t bg-background px-2 py-2">
			<div class="flex items-end gap-2">
				<textarea
					ref={textareaRef}
					class="textarea flex-1 min-h-[44px] max-h-[200px] resize-none text-sm py-2 px-4"
					placeholder={t("chat.type_message_placeholder") + " (Shift+Enter for new line)"}
					rows={1}
					onInput={autoResize}
					onKeyDown={handleKeyDown}
				/>
				<div ref={buttonContainerRef} onMount={renderButton} />
			</div>
		</div>
	);
}
