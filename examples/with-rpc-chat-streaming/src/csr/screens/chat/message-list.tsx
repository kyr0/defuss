import { $, createRef, render } from "defuss";
import { updateWithMarkdown } from "defuss-markdown";
import { chatStore, getActiveConversation, deleteMessage, resendMessage } from "../../lib/chat-store";
import type { ChatMessage } from "../../../models/chat";
import { t } from "../../i18n";

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

export function setStreamRendering(msgId: string | null) {
	streamRenderingMsgId = msgId;
}

export function MessageList() {
	const containerRef = createRef<HTMLDivElement>();

	const scrollToBottom = () => {
		const el = containerRef.current;
		if (el) {
			el.scrollTop = el.scrollHeight;
		}
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
					<MessageBubble key={msg.id} message={msg} />
				))}
			</div>,
		);

		renderMarkdownMessages(conv.messages);
		requestAnimationFrame(scrollToBottom);
	};

	chatStore.subscribe(renderMessages);

	return (
		<div ref={containerRef} class="chat-messages flex-1 overflow-y-auto scrollbar p-4" onMount={renderMessages}>
			<div class="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
				<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
				<div>
					<p class="text-lg font-medium text-foreground/80">{t("chat.start_conversation")}</p>
					<p class="text-sm text-muted-foreground mt-1">{t("chat.type_message_to_begin")}</p>
				</div>
			</div>
		</div>
	);
}

function MessageBubble({ message }: { key: string; message: ChatMessage }) {
	const isUser = message.role === "user";
	const isPendingAssistant = message.role === "assistant" && !message.content;
	const conv = getActiveConversation();

	const handleDelete = (e: Event) => {
		e.stopPropagation();
		if (conv) {
			deleteMessage(conv.id, message.id);
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

		if (targetMessage && targetMessage.role === "user") {
			resendMessage(conv.id, targetMessage.id);
			window.dispatchEvent(new CustomEvent("chat:resend", {
				detail: { conversationId: conv.id, messageId: targetMessage.id, content: targetMessage.content },
			}));
		}
	};

	return (
		<div class={`flex group ${isUser ? "justify-end" : "justify-start"}`}>
			<div
				class={`chat-bubble max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed relative ${isUser
					? "bg-primary text-primary-foreground rounded-br-md"
					: "bg-white/70 dark:bg-white/10 text-foreground rounded-bl-md border border-gray-200 dark:border-gray-700"
					}`}
			>
				<div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 flex gap-1 transition-all">
					{!isPendingAssistant && (
						<button
							type="button"
							class="p-1 rounded transition-all cursor-pointer border border-gray-300 dark:border-gray-600 hover:border-primary/50 hover:bg-primary/20"
							onClick={handleResend}
							aria-label={t("chat.resend_message")}
							title={t("chat.resend_message")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /></svg>
						</button>
					)}
					<button
						type="button"
						class="p-1 rounded transition-all cursor-pointer border border-gray-300 dark:border-gray-600 hover:border-destructive hover:bg-destructive/20 hover:text-destructive"
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
			</div>
		</div>
	);
}
