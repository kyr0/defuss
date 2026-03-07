import { type FC, createRef, $ } from "defuss";
import { appStore, manifest, storybookConfig } from "./App.js";

interface SidebarGroup {
  label: string;
  entries: Array<{ id: string; title: string; type: string }>;
}

function groupStories(entries: any[], filter: string): SidebarGroup[] {
  const groups = new Map<string, SidebarGroup>();

  for (const entry of entries) {
    // Filter by search term
    if (filter && !entry.title.toLowerCase().includes(filter.toLowerCase())) {
      continue;
    }

    // Group by slash-separated path: "Components/Button" → group "Components"
    const parts = entry.title.split("/");
    const groupLabel =
      parts.length > 1 ? parts.slice(0, -1).join("/") : "Stories";
    const itemTitle = parts[parts.length - 1];

    if (!groups.has(groupLabel)) {
      groups.set(groupLabel, { label: groupLabel, entries: [] });
    }
    groups.get(groupLabel)!.entries.push({
      id: entry.id,
      title: itemTitle,
      type: entry.type,
    });
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.label.localeCompare(b.label),
  );
}

export const StorybookSidebar: FC = () => {
  const listRef = createRef<HTMLDivElement>();
  const searchRef = createRef<HTMLInputElement>();

  const selectStory = (storyId: string) => {
    window.location.hash = storyId;
    appStore.set({
      activeStoryId: storyId,
      activeStoryName: null,
      filter: appStore.value.filter,
    });
    renderList();
  };

  const renderList = () => {
    const { filter, activeStoryId } = appStore.value;
    const groups = groupStories(manifest, filter);

    $(listRef).jsx(
      <div>
        {groups.length === 0 ? (
          <div class="p-4 text-sm text-muted-foreground italic">
            No stories match your filter.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div class="sb-group-label">{group.label}</div>
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  class={`sb-story-item ${activeStoryId === entry.id ? "active" : ""}`}
                  onClick={() => selectStory(entry.id)}
                >
                  <span class="mr-2">{entry.type === "mdx" ? "📄" : "🧩"}</span>
                  {entry.title}
                </div>
              ))}
            </div>
          ))
        )}
      </div>,
    );
  };

  const onSearchInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    appStore.set("filter", target.value);
    renderList();
  };

  const onMount = () => {
    renderList();
  };

  return (
    <div onMount={onMount}>
      <div class="sb-sidebar-header">
        <div class="font-semibold text-sm mb-2">{storybookConfig.title}</div>
        <input
          ref={searchRef}
          type="text"
          placeholder="Filter stories..."
          class="input w-full text-sm"
          onInput={onSearchInput}
        />
      </div>
      <div ref={listRef} class="py-1">
        {/* Populated by renderList */}
      </div>
    </div>
  );
};
