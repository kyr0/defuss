import { $, createRef, render } from "defuss";
import { updateWithMarkdown } from "defuss-markdown";
import { chatStore, getActiveConversation, deleteMessage, resendMessage, updateMessageContent } from "../../lib/chat-store";
import type { ChatMessage } from "../../../models/chat";
import { t } from "../../i18n";
import { ConfirmDialog, openConfirmDialog, closeConfirmDialog } from "../../components/confirm-dialog";

/** Strips ```markdown / ``` fences that LLMs wrap tables or lists in. */
function stripMarkdownFences(text: string): string {
	return text.replace(/```(?:markdown|md)\n([\s\S]*?)\n?```\s*\n?/g, (match, inner) => {
		if (inner.includes("|") || /^\s*[-*]\s/m.test(inner) || /^\s*\d+\.\s/m.test(inner)) {
			const content = inner.replace(/^\n/, "").replace(/\n+$/, "");
			return `\n\n${content}\n\n`;
		}
		return match;
	});
}

let streamRenderingMsgId: string | null = null;

// Auto-scroll threshold in pixels from bottom
const AUTO_SCROLL_THRESHOLD = 5;

// Track auto-scroll intent (true by default, only changed by user scroll)
let shouldAutoScroll = true;

// Track scroll position to restore on cancel edit
let savedScrollTop: number | null = null;

// Track which messages are in edit mode (persists across re-renders)
const editingMessages = new Set<string>();

export function setStreamRendering(msgId: string | null) {
	streamRenderingMsgId = msgId;
}

export function setShouldAutoScroll(value: boolean) {
	shouldAutoScroll = value;
}

export function shouldAutoScrollGet(): boolean {
	return shouldAutoScroll;
}

export function scrollToBottomForce() {
	const container = document.querySelector<HTMLDivElement>(".chat-messages");
	if (container) {
		savedScrollTop = null; // Clear saved position on force scroll
		container.scrollTop = container.scrollHeight;
		shouldAutoScroll = true;
	}
}

export function MessageList() {
	const containerRef = createRef<HTMLDivElement>();

	// Confirmation dialog state
	let confirmType: 'delete' | 'retry' | null = null;
	let confirmMessageId: string | null = null;
	let confirmConversationId: string | null = null;

	const checkScrollPosition = () => {
		const el = containerRef.current;
		if (!el) return;
		const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
		shouldAutoScroll = distanceFromBottom <= AUTO_SCROLL_THRESHOLD;
	};

	const scrollToBottom = () => {
		if (!shouldAutoScroll) return;
		const el = containerRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
	};

	const confirmDelete = (convId: string, msgId: string) => {
		confirmType = 'delete';
		confirmMessageId = msgId;
		confirmConversationId = convId;
		openConfirmDialog('delete');
	};

	const confirmRetry = (convId: string, msgId: string) => {
		confirmType = 'retry';
		confirmMessageId = msgId;
		confirmConversationId = convId;
		openConfirmDialog('retry');
	};

	const closeConfirm = () => {
		confirmType = null;
		confirmMessageId = null;
		confirmConversationId = null;
		closeConfirmDialog();
	};

	const handleConfirm = () => {
		if (confirmType === 'delete' && confirmConversationId && confirmMessageId) {
			deleteMessage(confirmConversationId, confirmMessageId);
		} else if (confirmType === 'retry' && confirmConversationId && confirmMessageId) {
			const conv = getActiveConversation();
			if (conv) {
				const msg = conv.messages.find(m => m.id === confirmMessageId);
				if (msg) {
					resendMessage(confirmConversationId, confirmMessageId);
					window.dispatchEvent(new CustomEvent("chat:resend", {
						detail: { conversationId: confirmConversationId, messageId: confirmMessageId, content: msg.content },
					}));
					setTimeout(scrollToBottomForce, 500);
				}
			}
		}
		closeConfirm();
	};

	const renderMarkdownMessages = (messages: ChatMessage[]) => {
		for (const msg of messages) {
			if (msg.role === "assistant" && msg.content && msg.id !== streamRenderingMsgId) {
				const contentEl = containerRef.current?.querySelector(`[data-msg-id="${msg.id}"]`);
				if (contentEl) {
					updateWithMarkdown(contentEl as Element, stripMarkdownFences(msg.content), { render });
				}
			}
		}
	};

	const renderMessages = () => {
		if (streamRenderingMsgId) {
			requestAnimationFrame(scrollToBottom);
			return;
		}

		// Restore saved scroll position if canceling edit
		if (savedScrollTop !== null) {
			const container = containerRef.current;
			if (container) {
				container.scrollTop = savedScrollTop;
				savedScrollTop = null;
			}
			return;
		}

		const conv = getActiveConversation();

		if (!conv || conv.messages.length === 0) {
			$(containerRef).update(
				<div class="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
					<div>
						<p class="text-lg font-medium text-foreground/80">{t("chat.start_conversation")}</p>
						<p class="text-sm text-muted-foreground mt-1">{t("chat.type_message_to_begin")}</p>
					</div>
				</div>,
			);
			return;
		}

		$(containerRef).update(
			<div class="mx-auto space-y-4 w-full" style="max-width: min(48rem, 100%)">
				{conv.messages.map((msg) => (
					<MessageBubble key={msg.id} message={msg} onDelete={confirmDelete} onRetry={confirmRetry} />
				))}
			</div>,
		);

		renderMarkdownMessages(conv.messages);
		requestAnimationFrame(scrollToBottomForce);
	};

	chatStore.subscribe(renderMessages);

	return (
		<>
			<div ref={containerRef} class="chat-messages flex-1 overflow-y-auto scrollbar p-4" onMount={() => {
				$(containerRef).on("wheel", () => {
					// If user scrolls to absolute bottom, re-enable auto-scroll
					const el = containerRef.current;
					if (el) {
						requestAnimationFrame(() => {
							const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
							if (distanceFromBottom <= AUTO_SCROLL_THRESHOLD) {
								shouldAutoScroll = true;
							} else {
								shouldAutoScroll = false;
							}
						});
					}
				}, { passive: true });
				renderMessages();
			}}>
				<div class="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
					<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
					<div>
						<p class="text-lg font-medium text-foreground/80">{t("chat.start_conversation")}</p>
						<p class="text-sm text-muted-foreground mt-1">{t("chat.type_message_to_begin")}</p>
					</div>
				</div>
			</div>
			<ConfirmDialog
				onConfirm={handleConfirm}
				onCancel={closeConfirm}
			/>
		</>
	);
}

function MessageBubble({ message, onDelete, onRetry }: { key: string; message: ChatMessage; onDelete?: (convId: string, msgId: string) => void; onRetry?: (convId: string, msgId: string) => void }) {
	const isUser = message.role === "user";
	const isPendingAssistant = message.role === "assistant" && !message.content;
	const conv = getActiveConversation();

	// Edit mode state (from module-level Set to persist across re-renders)
	const isEditing = editingMessages.has(message.id);
	const textareaRef = createRef<HTMLTextAreaElement>();

	const autoResizeTextarea = () => {
		const el = textareaRef.current;
		if (el) {
			el.style.height = "auto";
			el.style.height = Math.min(el.scrollHeight, 200) + "px";
		}
	};

	const handleDelete = (e: Event) => {
		e.stopPropagation();
		if (conv && onDelete) {
			onDelete(conv.id, message.id);
		}
	};

	const handleResend = (e: Event) => {
		e.stopPropagation();
		if (!conv) return;

		// For assistant messages, find the preceding user message
		const idx = conv.messages.findIndex((m) => m.id === message.id);
		const targetMessage = isUser
			? message
			: conv.messages[idx - 1];

		if (targetMessage && targetMessage.role === "user" && onRetry) {
			onRetry(conv.id, targetMessage.id);
		}
	};

	const handleCopy = (e: Event) => {
		e.stopPropagation();
		const btn = (e.target as HTMLElement).closest("button");
		navigator.clipboard.writeText(message.content || "")
			.then(() => {
				if (btn) {
					btn.classList.add("copied");
					setTimeout(() => btn.classList.remove("copied"), 2000);
				}
			})
			.catch(console.error);
	};

	const handleEdit = (e: Event) => {
		e.stopPropagation();
		editingMessages.add(message.id);
		const bubbleEl = document.querySelector<HTMLElement>(`[data-msg-id="${message.id}"]`);
		if (bubbleEl) {
			const parent = bubbleEl.closest(".flex.group");
			if (parent) {
				$(parent).jsx(<MessageBubble key={message.id} message={message} />);
			}
		}
	};

	const handleSave = () => {
		const textarea = textareaRef.current;
		if (!textarea || !conv) return;
		const newContent = textarea.value.trim();
		if (!newContent) return;

		// Exit edit mode
		editingMessages.delete(message.id);

		// Update message content
		updateMessageContent(conv.id, message.id, newContent);

		// Trim follow-ups and trigger resend with new content
		resendMessage(conv.id, message.id);
		window.dispatchEvent(new CustomEvent("chat:resend", {
			detail: { conversationId: conv.id, messageId: message.id, content: newContent },
		}));
	};

	const handleCancel = (e: Event) => {
		e.stopPropagation();
		e.preventDefault();
		editingMessages.delete(message.id);
		// Save current scroll position to restore after re-render
		const container = document.querySelector<HTMLDivElement>(".chat-messages");
		if (container) {
			savedScrollTop = container.scrollTop;
		}
		// Trigger re-render via store to exit edit mode
		chatStore.set({ ...chatStore.value });
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSave();
		} else if (e.key === "Escape") {
			e.preventDefault();
			handleCancel(e);
		}
	};

	if (isEditing && isUser) {
		return (
			<div class={`flex group ${isUser ? "justify-end" : "justify-start"}`}>
				<div
					class={`chat-bubble max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative ${isUser
						? "bg-primary text-primary-foreground rounded-br-md"
						: "bg-white/70 dark:bg-white/10 text-foreground rounded-bl-md border border-gray-200 dark:border-gray-700"
						}`}
				>
					<textarea
						ref={textareaRef}
						class="w-full bg-transparent border-none outline-none text-inherit resize-none"
						rows={2}
						value={message.content}
						onKeyDown={handleKeyDown}
						onMount={() => {
							autoResizeTextarea();
							textareaRef.current?.focus();
						}}
					/>
					<div class="flex gap-1 mt-2 justify-end">
						<button
							type="button"
							class="p-1 rounded transition-all cursor-pointer border border-white/40 hover:bg-primary-foreground/20 hover:border-white/60"
							onClick={handleCancel}
							aria-label={t("chat.cancel_edit")}
							title={t("chat.cancel_edit")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
						</button>
						<button
							type="button"
							class="p-1 rounded transition-all cursor-pointer border border-white/40 hover:bg-primary-foreground/90 hover:text-primary-foreground hover:border-white/60"
							onClick={handleSave}
							aria-label={t("chat.save_edit")}
							title={t("chat.save_edit")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
						</button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div class={`flex group ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				class={`chat-bubble max-w-[80%] rounded-2xl px-4 py-2.5 text-sm min-w-[125px] leading-relaxed relative ${isUser
					? "bg-primary text-primary-foreground rounded-br-md"
					: "bg-white/70 dark:bg-white/10 text-foreground rounded-bl-md border border-gray-200 dark:border-gray-700"
					}`}
			>
					<div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
						{isUser && !isPendingAssistant && (
							<button
								type="button"
								class={`p-1 rounded transition-all cursor-pointer border hover:bg-primary/20 ${isUser ? "border-white/40 hover:border-white/60" : "border-gray-300 dark:border-gray-600 hover:border-primary/50"}`}
								onClick={handleEdit}
								aria-label={t("chat.edit_message")}
								title={t("chat.edit_message")}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
							</button>
						)}
						{!isPendingAssistant && (
							<button
								type="button"
								class={`group p-1 rounded transition-all cursor-pointer border hover:border-primary/50 hover:bg-primary/20 ${isUser ? "border-white/40" : "border-gray-300 dark:border-gray-600"}`}
								onClick={handleCopy}
								aria-label={t("chat.copy_message")}
								title={t("chat.copy_message")}
							>
								<div class="group-[.copied]:hidden">
									<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
								</div>
								<div class="hidden group-[.copied]:block">
									<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
								</div>
							</button>
						)}
						{!isPendingAssistant && (
							<button
								type="button"
								class={`p-1 rounded transition-all cursor-pointer border hover:bg-primary/20 ${isUser ? "border-white/40 hover:border-white/60" : "border-gray-300 dark:border-gray-600 hover:border-primary/50"}`}
								onClick={handleResend}
								aria-label={t("chat.resend_message")}
								title={t("chat.resend_message")}
							>
								<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 21h5v-5" /></svg>
							</button>
						)}
						<button
							type="button"
							class={`p-1 rounded transition-all cursor-pointer border hover:bg-destructive/20 hover:text-destructive ${isUser ? "border-white/40 hover:border-white/60" : "border-gray-300 dark:border-gray-600 hover:border-destructive"}`}
							onClick={handleDelete}
							aria-label={t("chat.delete_message")}
							title={t("chat.delete_message")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
						</button>
					</div>
				{isPendingAssistant && (
					<div
						data-msg-loading={message.id}
						class="chat-bubble-loading"
						aria-label="Assistant response is loading"
					>
						<span class="streaming-dot" style="animation-delay: 0s" />
						<span class="streaming-dot" style="animation-delay: 0.15s" />
						<span class="streaming-dot" style="animation-delay: 0.3s" />
					</div>
				)}
				<div
					class={`text-[10px] mb-1 font-medium ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"} ${isPendingAssistant ? "hidden" : ""}`}
				>
					{isUser ? t("chat.user_label") : (message.meta?.model ?? "")}
				</div>
				<div
					data-msg-id={message.id}
					class={`${isUser
						? "whitespace-pre-wrap break-words"
						: "prose prose-sm dark:prose-invert max-w-none break-words"
						} ${isPendingAssistant ? "hidden" : ""}`}
				>
					{message.content}
				</div>
				<div
					data-msg-time={message.id}
					class={`text-[10px] mt-1 ${isUser ? "text-primary-foreground/60" : "text-muted-foreground"} ${isPendingAssistant ? "hidden" : ""}`}
				>
					{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
				</div>
				{!isUser && !isPendingAssistant && chatStore.value.settings.devMode && message.meta?.callTrace && message.meta.callTrace.length > 0 && (() => {
					console.log("[MessageBubble] rendering call trace for msg", message.id, "devMode=", chatStore.value.settings.devMode, "callTrace=", message.meta.callTrace);
					return (
					<div class="call-trace-footer" data-msg-calltrace={message.id}>
						{message.meta.callTrace.map((entry, i) => (
							<div key={`${message.id}-trace-${i}`} class={`call-trace-entry call-trace-${entry.type}`}>
								<span class="call-trace-type">{entry.type}</span>
								<span class="call-trace-name">{entry.name}</span>
								{entry.result && Object.keys(entry.result).length > 0 && (
									<span class="call-trace-result">
										{Object.entries(entry.result).map(([k, v]) => (
											<span key={k} class="call-trace-kv">{k}={String(v)}</span>
										))}
									</span>
								)}
							</div>
						))}
					</div>
					);
				})()}
			</div>
		</div>
	);
	}
