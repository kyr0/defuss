import { createStore } from "defuss";
import type { Conversation, ChatSettings, AssistantMessageMeta } from "../../models/chat";
import { DEFAULT_CHAT_SETTINGS } from "../../models/chat";

export interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  isStreaming: boolean;
  settings: ChatSettings;
}

export const chatStore = createStore<ChatState>({
  conversations: [],
  activeConversationId: null,
  isStreaming: false,
  settings: { ...DEFAULT_CHAT_SETTINGS },
});

export function getActiveConversation(): Conversation | undefined {
  const { conversations, activeConversationId } = chatStore.value;
  return conversations.find((c) => c.id === activeConversationId);
}

export function createConversation(): Conversation {
  const id = `conv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const conversation: Conversation = {
    id,
    title: "New conversation",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  chatStore.set({
    ...chatStore.value,
    conversations: [conversation, ...chatStore.value.conversations],
    activeConversationId: id,
  });
  saveConversationsToStorage();

  return conversation;
}

export function setActiveConversation(id: string) {
  chatStore.set({ ...chatStore.value, activeConversationId: id });
  saveConversationsToStorage();
}

export function deleteConversation(id: string) {
  const { conversations, activeConversationId } = chatStore.value;
  const filtered = conversations.filter((c) => c.id !== id);
  chatStore.set({
    ...chatStore.value,
    conversations: filtered,
    activeConversationId: activeConversationId === id ? (filtered[0]?.id ?? null) : activeConversationId,
  });
  saveConversationsToStorage();
}

export function updateConversationTitle(id: string, title: string) {
  const { conversations } = chatStore.value;
  chatStore.set({
    ...chatStore.value,
    conversations: conversations.map((c) =>
      c.id === id ? { ...c, title, updatedAt: new Date().toISOString() } : c,
    ),
  });
  saveConversationsToStorage();
}

export function addMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
  meta?: AssistantMessageMeta,
): string {
  const msgId = `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const { conversations } = chatStore.value;

  chatStore.set({
    ...chatStore.value,
    conversations: conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: [
              ...c.messages,
              { id: msgId, role, content, createdAt: new Date().toISOString(), meta: role === "assistant" ? meta : undefined },
            ],
            updatedAt: new Date().toISOString(),
          }
        : c,
    ),
  });

  return msgId;
}

export function deleteMessage(conversationId: string, messageId: string) {
  const { conversations } = chatStore.value;
  chatStore.set({
    ...chatStore.value,
    conversations: conversations.map((c) => {
      if (c.id !== conversationId) return c;
      const idx = c.messages.findIndex((m) => m.id === messageId);
      if (idx === -1) return c;
      const target = c.messages[idx];
      // If deleting a user message, also remove all following assistant messages
      if (target.role === "user") {
        const remaining = c.messages.slice(0, idx);
        return { ...c, messages: remaining, updatedAt: new Date().toISOString() };
      }
      // If deleting an assistant message, just remove it
      return {
        ...c,
        messages: c.messages.filter((m) => m.id !== messageId),
        updatedAt: new Date().toISOString(),
      };
    }),
  });
  saveConversationsToStorage();
}

export function resendMessage(conversationId: string, messageId: string) {
  const { conversations } = chatStore.value;
  chatStore.set({
    ...chatStore.value,
    conversations: conversations.map((c) => {
      if (c.id !== conversationId) return c;
      const index = c.messages.findIndex((m) => m.id === messageId);
      if (index === -1) return c;
      // Keep user message + everything before it, remove all follow-ups after
      return {
        ...c,
        messages: c.messages.slice(0, index + 1),
        updatedAt: new Date().toISOString(),
      };
    }),
  });
  saveConversationsToStorage();
}

export function updateMessageContent(conversationId: string, messageId: string, content: string) {
  const { conversations } = chatStore.value;
  chatStore.set({
    ...chatStore.value,
    conversations: conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId ? { ...m, content } : m,
            ),
            updatedAt: new Date().toISOString(),
          }
        : c,
    ),
  });
  saveConversationsToStorage();
}

export function updateMessageMeta(conversationId: string, messageId: string, meta: Partial<AssistantMessageMeta>) {
  const { conversations } = chatStore.value;
  chatStore.set({
    ...chatStore.value,
    conversations: conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            messages: c.messages.map((m) =>
              m.id === messageId && m.meta ? { ...m, meta: { ...m.meta, ...meta } } : m,
            ),
            updatedAt: new Date().toISOString(),
          }
        : c,
    ),
  });
  saveConversationsToStorage();
}

export function saveSettingsToStorage(settings: ChatSettings) {
  try {
    localStorage.setItem("chat_settings", JSON.stringify(settings));
  } catch {}
}

export function loadSettingsFromStorage(): ChatSettings {
  try {
    const stored = localStorage.getItem("chat_settings");
    if (stored) {
      return { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {}
  return { ...DEFAULT_CHAT_SETTINGS };
}

export function saveConversationsToStorage() {
  try {
    localStorage.setItem("chat_conversations", JSON.stringify(chatStore.value.conversations));
  } catch {}
}

export function loadConversationsFromStorage() {
  try {
    const stored = localStorage.getItem("chat_conversations");
    if (stored) {
      const conversations = JSON.parse(stored) as Conversation[];
      chatStore.set({
        ...chatStore.value,
        conversations,
        activeConversationId: conversations[0]?.id ?? null,
      });
    }
  } catch {}
}
