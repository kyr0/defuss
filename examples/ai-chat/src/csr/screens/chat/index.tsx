import { $, createRef } from "defuss";
import { chatStore, getActiveConversation } from "../../lib/chat-store";
import { LeftSidebar } from "./left-sidebar";
import { RightSidebar } from "./right-sidebar";
import { MessageList } from "./message-list";
import { ChatInput } from "./chat-input";
import { t } from "../../i18n";

export function ChatScreen() {
	const headerTitleRef = createRef<HTMLSpanElement>();
	const streamingIndicatorRef = createRef<HTMLSpanElement>();
	const modelLabelRef = createRef<HTMLSpanElement>();

	const updateHeader = () => {
		const conv = getActiveConversation();
		const title = conv?.title || t("chat.new_conversation");
		const titleEl = headerTitleRef.current;
		if (titleEl) {
			titleEl.textContent = title;
		}

		const indicatorEl = streamingIndicatorRef.current;
		if (indicatorEl) {
			if (chatStore.value.isStreaming) {
				indicatorEl.classList.remove("hidden");
			} else {
				indicatorEl.classList.add("hidden");
			}
		}

		const modelEl = modelLabelRef.current;
		if (modelEl) {
			modelEl.textContent = chatStore.value.settings.model;
		}
	};

	chatStore.subscribe(updateHeader);

	return (
		<div class="chat-layout flex h-full">
			<LeftSidebar />

			<div class="chat-main flex flex-col flex-1 min-w-0">
				<header class="flex items-center justify-between px-1 py-1 h-10 border-b bg-background/80 backdrop-blur-sm">
					<div class="flex items-center gap-2 min-w-0">
						<button
							type="button"
							class="btn-icon-ghost size-8 shrink-0"
							onClick={() => (window as any).__toggleLeftSidebar?.()}
							aria-label={t("chat.toggle_conversations")}
							title={t("chat.toggle_conversations")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
						</button>
						<span ref={headerTitleRef} class="font-semibold text-sm truncate" onMount={updateHeader}>{t("chat.new_conversation")}</span>
						<span ref={streamingIndicatorRef} class="hidden">
							<span class="streaming-dot" />
						</span>
					</div>
					<div class="flex items-center gap-2">
						<span ref={modelLabelRef} class="text-xs text-muted-foreground">{chatStore.value.settings.model}</span>
						<button
							type="button"
							class="btn-icon-ghost size-8 shrink-0"
							onClick={() => (window as any).__toggleRightSidebar?.()}
							aria-label={t("chat.toggle_settings")}
							title={t("chat.toggle_settings")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
						</button>
					</div>
				</header>

				<MessageList />
				<ChatInput />
			</div>

			<RightSidebar />
		</div>
	);
}
