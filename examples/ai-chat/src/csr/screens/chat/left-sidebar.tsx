import { $, createRef } from "defuss";
import { Button } from "defuss-shadcn";
import {
	chatStore,
	setActiveConversation,
	createConversation,
	deleteConversation,
	updateConversationTitle,
} from "../../lib/chat-store";
import { t } from "../../i18n";

// Track which conversations are being edited (persists across re-renders)
const editingTitles = new Set<string>();

function ConversationItem({
	conv,
	isActive,
	isEditing,
	onEdit,
	onSave,
	onCancel,
	onKeyDown,
}: {
	key: string;
	conv: { id: string; title: string };
	isActive: boolean;
	isEditing: boolean;
	onEdit: (convId: string, e: Event) => void;
	onSave: (convId: string, input: HTMLInputElement) => void;
	onCancel: (convId: string) => void;
	onKeyDown: (convId: string, input: HTMLInputElement, e: KeyboardEvent) => void;
}) {
	const inputRef = createRef<HTMLInputElement>();

	if (isEditing) {
		return (
			<div
				class={`w-full px-3 py-2.5 text-sm rounded-lg mb-0.5 flex items-center gap-2 ${isActive
					? "bg-white/20 text-accent-foreground"
					: "bg-white/80 text-foreground/80"
					}`}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
				<input
					ref={inputRef}
					type="text"
					class="flex-1 bg-transparent border-none outline-none text-sm text-inherit truncate"
					value={conv.title}
					onKeyDown={(e: KeyboardEvent) => onKeyDown(conv.id, inputRef.current!, e)}
					onMount={() => {
						inputRef.current?.select();
					}}
				/>
				<button
					type="button"
					class="shrink-0 p-0.5 rounded hover:bg-primary/20 transition-all"
					onClick={() => onSave(conv.id, inputRef.current!)}
					aria-label={t("sidebar.save_title")}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
				</button>
				<button
					type="button"
					class="shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all"
					onClick={() => onCancel(conv.id)}
					aria-label={t("sidebar.cancel_title")}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
				</button>
			</div>
		);
	}

	return (
		<button
			type="button"
			class={`w-full text-left px-3 py-2.5 text-sm rounded-md mb-0.5 group flex items-center gap-2 transition-colors relative ${isActive
				? "bg-white/10 text-accent-foreground font-medium"
				: "hover:bg-accent/50 text-foreground/80"
				}`}
			onClick={() => setActiveConversation(conv.id)}
		>
			{isActive && <span class="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />}
			<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 opacity-50"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
			<span class="truncate flex-1">{conv.title}</span>
			<button
				type="button"
				class="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-primary/20 transition-all border-1 p-1 cursor-pointer"
				onClick={(e: Event) => onEdit(conv.id, e)}
				aria-label={t("sidebar.edit_title")}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
			</button>
			<button
				type="button"
				class="opacity-0 group-hover:opacity-100 shrink-0 p-0.5 rounded hover:bg-destructive/20 hover:text-destructive transition-all p-1 border-1 cursor-pointer"
				onClick={(e: Event) => {
					e.stopPropagation();
					deleteConversation(conv.id);
				}}
				aria-label={t("sidebar.delete_conversation")}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
			</button>
		</button>
	);
}

export function LeftSidebar() {
	const listRef = createRef<HTMLDivElement>();
	const sidebarRef = createRef<HTMLElement>();

	const toggleCollapse = () => {
		const el = sidebarRef.current;
		if (el) el.classList.toggle("collapsed");
	};

	// Expose toggle via a global so the chat header can call it
	(window as any).__toggleLeftSidebar = toggleCollapse;

	const startEditTitle = (convId: string, e: Event) => {
		e.stopPropagation();
		editingTitles.add(convId);
		renderList();
	};

	const saveTitle = (convId: string, input: HTMLInputElement) => {
		const newTitle = input.value.trim();
		if (newTitle) {
			updateConversationTitle(convId, newTitle);
		}
		editingTitles.delete(convId);
		renderList();
	};

	const cancelTitle = (convId: string) => {
		editingTitles.delete(convId);
		renderList();
	};

	const handleTitleKeyDown = (convId: string, input: HTMLInputElement, e: KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			saveTitle(convId, input);
		} else if (e.key === "Escape") {
			e.preventDefault();
			cancelTitle(convId);
		}
	};

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
				{conversations.map((conv) => {
					const isEditing = editingTitles.has(conv.id);
					return (
						<ConversationItem
							key={conv.id}
							conv={conv}
							isActive={conv.id === activeConversationId}
							isEditing={isEditing}
							onEdit={startEditTitle}
							onSave={saveTitle}
							onCancel={cancelTitle}
							onKeyDown={handleTitleKeyDown}
						/>
					);
				})}
			</div>,
		);
	};

	const handleNewChat = () => {
		createConversation();
	};

	chatStore.subscribe(renderList);

	return (
		<aside ref={sidebarRef} class="chat-sidebar-left flex flex-col h-full border-r bg-sidebar text-sidebar-foreground">
			<div class="flex items-center justify-between px-2 py-1 h-10 border-b sidebar-header-content">
				<h2 class="font-semibold text-sm">{t("sidebar.conversations")}</h2>
				<Button
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
