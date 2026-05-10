import { $, createRef } from "defuss";
import { Button } from "defuss-shadcn";
import {
	chatStore,
	setActiveConversation,
	createConversation,
	deleteConversation,
} from "../../lib/chat-store";
import { t } from "../../i18n";

export function LeftSidebar() {
	const listRef = createRef<HTMLDivElement>();
	const sidebarRef = createRef<HTMLElement>();

	const toggleCollapse = () => {
		const el = sidebarRef.current;
		if (el) el.classList.toggle("collapsed");
	};

	// Expose toggle via a global so the chat header can call it
	(window as any).__toggleLeftSidebar = toggleCollapse;

	const renderList = () => {
		const { conversations, activeConversationId } = chatStore.value;

		if (conversations.length === 0) {
			$(listRef).update(
				<div class="flex-1 flex items-center justify-center p-4">
					<p class="text-sm text-muted-foreground text-center">{t("sidebar.no_conversations")}</p>
				</div>,
			);
			return;
		}

		$(listRef).update(
			<div class="flex-1 overflow-y-auto scrollbar">
				{conversations.map((conv) => (
					<button
						key={conv.id}
						type="button"
						class={`w-full text-left px-3 py-2.5 text-sm rounded-lg mb-0.5 group flex items-center gap-2 transition-colors ${conv.id === activeConversationId
							? "bg-accent text-accent-foreground"
							: "hover:bg-accent/50 text-foreground/80"
							}`}
						onClick={() => setActiveConversation(conv.id)}
					>
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
						<span class="truncate flex-1">{conv.title}</span>
						<button
							type="button"
							class="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
							onClick={(e: Event) => {
								e.stopPropagation();
								deleteConversation(conv.id);
							}}
							aria-label={t("sidebar.delete_conversation")}
						>
							<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
						</button>
					</button>
				))}
			</div>,
		);
	};

	const handleNewChat = () => {
		createConversation();
	};

	chatStore.subscribe(renderList);

	return (
		<aside ref={sidebarRef} class="chat-sidebar-left flex flex-col h-full border-r bg-sidebar text-sidebar-foreground">
			<div class="flex items-center justify-between px-3 py-3 border-b sidebar-header-content">
				<h2 class="font-semibold text-sm">{t("sidebar.conversations")}</h2>
				<Button
					variant="ghost"
					size="icon"
					className="size-7"
					onClick={handleNewChat}
					aria-label={t("sidebar.new_conversation")}
					title={t("sidebar.new_conversation")}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
				</Button>
			</div>
			<div ref={listRef} class="flex-1 overflow-y-auto p-1.5 sidebar-list" onMount={renderList} />
		</aside>
	);
}
