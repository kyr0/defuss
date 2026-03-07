import { type FC, createRef, $ } from "defuss";
import { appStore, manifest } from "./App.js";

interface StoryGroup {
  label: string;
  entries: Array<{ id: string; title: string; type: string }>;
}

function groupStories(entries: any[], filter: string): StoryGroup[] {
  const groups = new Map<string, StoryGroup>();

  for (const entry of entries) {
    if (filter && !entry.title.toLowerCase().includes(filter.toLowerCase())) {
      continue;
    }

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
      <div class="p-2">
        {groups.length === 0 ? (
          <div class="p-4 text-sm text-muted-foreground italic">
            No stories match your filter.
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.label} class="mb-2">
              <div class="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </div>
              <ul>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <a
                      class={`sb-story-item ${activeStoryId === entry.id ? "active" : ""}`}
                      href={`#${entry.id}`}
                      onClick={(e: MouseEvent) => {
                        e.preventDefault();
                        selectStory(entry.id);
                      }}
                    >
                      <span class="mr-2">{entry.type === "mdx" ? "📄" : "🧩"}</span>
                      {entry.title}
                    </a>
                  </li>
                ))}
              </ul>
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
        <input
          type="text"
          placeholder="Filter stories..."
          class="input w-full text-sm"
          onInput={onSearchInput}
        />
      </div>
      <div ref={listRef}>
        {/* Populated by renderList */}
      </div>
    </div>
  );
};
