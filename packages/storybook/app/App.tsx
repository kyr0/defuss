import { type FC, createStore, createRef, $ } from "defuss";
// @ts-ignore — virtual module provided by vite-plugin
import manifest from "virtual:storybook/manifest";
// @ts-ignore — virtual module provided by vite-plugin
import storyImporters from "virtual:storybook/stories";
// @ts-ignore — virtual module provided by vite-plugin
import storybookConfig from "virtual:storybook/config";
// @ts-ignore — virtual module provided by vite-plugin
import storySources from "virtual:storybook/sources";

import { StorybookSidebar } from "./Sidebar.js";
import { StoryView } from "./StoryView.js";
import { DocView } from "./DocView.js";
import { ViewportControls } from "./ViewportControls.js";
import { ThemeSwitcher } from "./ThemeSwitcher.js";

interface AppState {
  activeStoryId: string | null;
  activeStoryName: string | null;
  filter: string;
  sidebarOpen: boolean;
}

export const appStore = createStore<AppState>({
  activeStoryId: null,
  activeStoryName: null,
  filter: "",
  sidebarOpen: true,
});

export { manifest, storyImporters, storybookConfig, storySources };

export const App: FC = () => {
  const mainRef = createRef<HTMLDivElement>();
  const sidebarRef = createRef<HTMLDivElement>();

  // Read initial story from URL hash
  const hash = window.location.hash.slice(1); // remove #
  if (hash) {
    const [storyId, storyName] = hash.split("/");
    if (storyId) {
      appStore.set("activeStoryId", storyId);
      appStore.set("activeStoryName", storyName || null);
    }
  }

  const toggleSidebar = () => {
    const next = !appStore.value.sidebarOpen;
    appStore.set("sidebarOpen", next);
    if (sidebarRef.current) {
      sidebarRef.current.style.display = next ? "" : "none";
    }
  };

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
  appStore.subscribe((newVal, oldVal) => {
    if (newVal.activeStoryId !== oldVal.activeStoryId || newVal.activeStoryName !== oldVal.activeStoryName) {
      renderMain();
    }
  });

  // Listen for hash changes (back/forward navigation)
  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1);
    const [storyId, storyName] = hash.split("/");
    appStore.set({
      activeStoryId: storyId || null,
      activeStoryName: storyName || null,
      filter: appStore.value.filter,
      sidebarOpen: appStore.value.sidebarOpen,
    });
  });

  // Render initial state after mount via onMount
  const onMount = () => {
    renderMain();
  };

  return (
    <div class="sb-shell" onMount={onMount}>
      {/* Header toolbar */}
      <header class="sb-toolbar">
        <div class="flex items-center gap-2">
          {/* Sidebar toggle */}
          <button
            class="btn-icon-ghost size-7"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
            title="Toggle sidebar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v18" />
            </svg>
          </button>
          <span class="text-sm font-semibold">{storybookConfig.title}</span>
        </div>

        {/* Viewport controls — center */}
        <div class="flex-1 flex justify-center">
          <ViewportControls />
        </div>

        {/* Theme + dark mode — right */}
        <ThemeSwitcher />
      </header>

      {/* Body: sidebar + main */}
      <div class="sb-body">
        <div class="sb-sidebar" ref={sidebarRef}>
          <StorybookSidebar />
        </div>
        <div class="sb-main" ref={mainRef}>
          {/* Populated by renderMain */}
        </div>
      </div>
    </div>
  );
};
