import { type FC, createStore, createRef, $ } from "defuss";
// @ts-ignore — virtual module provided by vite-plugin
import manifest from "virtual:storybook/manifest";
// @ts-ignore — virtual module provided by vite-plugin
import storyImporters from "virtual:storybook/stories";
// @ts-ignore — virtual module provided by vite-plugin
import storybookConfig from "virtual:storybook/config";

import { StorybookSidebar } from "./Sidebar.js";
import { StoryView } from "./StoryView.js";
import { DocView } from "./DocView.js";

interface AppState {
  activeStoryId: string | null;
  activeStoryName: string | null;
  filter: string;
}

export const appStore = createStore<AppState>({
  activeStoryId: null,
  activeStoryName: null,
  filter: "",
});

export { manifest, storyImporters, storybookConfig };

export const App: FC = () => {
  const mainRef = createRef<HTMLDivElement>();

  // Read initial story from URL hash
  const hash = window.location.hash.slice(1); // remove #
  if (hash) {
    const [storyId, storyName] = hash.split("/");
    if (storyId) {
      appStore.set("activeStoryId", storyId);
      appStore.set("activeStoryName", storyName || null);
    }
  }

  const renderMain = () => {
    const { activeStoryId } = appStore.value;

    if (!activeStoryId) {
      $(mainRef).jsx(
        <div class="flex items-center justify-center h-full text-muted-foreground">
          <div class="text-center space-y-3">
            <h2 class="text-2xl font-semibold">{storybookConfig.title}</h2>
            <p>Select a story from the sidebar to get started.</p>
            <p class="text-sm">{manifest.length} stories discovered</p>
          </div>
        </div>,
      );
      return;
    }

    const entry = manifest.find((e: any) => e.id === activeStoryId);
    if (!entry) {
      $(mainRef).jsx(
        <div class="flex items-center justify-center h-full text-muted-foreground">
          Story not found: {activeStoryId}
        </div>,
      );
      return;
    }

    if (entry.type === "mdx") {
      $(mainRef).jsx(<DocView storyId={activeStoryId} />);
    } else {
      $(mainRef).jsx(
        <StoryView
          storyId={activeStoryId}
          storyName={appStore.value.activeStoryName}
        />,
      );
    }
  };

  // Re-render main area when active story changes
  appStore.subscribe(renderMain);

  // Listen for hash changes (back/forward navigation)
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1);
    const [storyId, storyName] = hash.split("/");
    appStore.set({
      activeStoryId: storyId || null,
      activeStoryName: storyName || null,
      filter: appStore.value.filter,
    });
  });

  // Render initial state after mount via onMount
  const onMount = () => {
    renderMain();
  };

  return (
    <div class="sb-shell" onMount={onMount}>
      <div class="sb-sidebar">
        <StorybookSidebar />
      </div>
      <div class="sb-main" ref={mainRef}>
        {/* Populated by renderMain */}
      </div>
    </div>
  );
};
