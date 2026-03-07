import { type FC, createRef, createStore, $ } from "defuss";
import { storyImporters, manifest } from "./App.js";
import { PropEditor } from "./PropEditor.js";

interface StoryViewProps {
  storyId: string;
  storyName?: string | null;
}

export const StoryView: FC<StoryViewProps> = ({ storyId, storyName }) => {
  const headerRef = createRef<HTMLDivElement>();
  const previewRef = createRef<HTMLDivElement>();
  const tabsRef = createRef<HTMLDivElement>();
  const controlsRef = createRef<HTMLDivElement>();
  const sourceRef = createRef<HTMLDivElement>();

  const propsStore = createStore<Record<string, unknown>>({});

  const onMount = async () => {
    const importer = storyImporters[storyId];
    if (!importer) {
      $(previewRef).jsx(
        <div class="text-red-500">No importer found for story: {storyId}</div>,
      );
      return;
    }

    let mod: any;
    try {
      mod = await importer();
    } catch (err: any) {
      $(previewRef).jsx(
        <div class="text-red-500">
          <p class="font-semibold">Failed to load story module:</p>
          <pre class="mt-2 text-sm bg-muted p-3 rounded overflow-auto">
            {String(err)}
          </pre>
        </div>,
      );
      return;
    }

    const meta = mod.meta || mod.default?.meta || {};
    const storyExports = getStoryExports(mod);

    if (storyExports.length === 0) {
      $(previewRef).jsx(
        <div class="text-muted-foreground italic">
          No story exports found. Export named functions from your
          .storybook.tsx file.
        </div>,
      );
      return;
    }

    // Find the entry in manifest for display title
    const entry = manifest.find((e: any) => e.id === storyId);
    const displayTitle = meta.title || entry?.title || storyId;

    // Render header
    $(headerRef).jsx(
      <div class="sb-header">
        <h1 class="text-lg font-semibold">{displayTitle}</h1>
        {meta.description && (
          <span class="text-sm text-muted-foreground">{meta.description}</span>
        )}
      </div>,
    );

    // Set up initial props from meta.args
    if (meta.args) {
      propsStore.set({ ...meta.args });
    }

    // Determine which story to show (first one by default or one matching storyName)
    const activeStoryKey = storyName
      ? storyExports.find(
          ([name]) => name.toLowerCase() === storyName.toLowerCase(),
        )?.[0]
      : storyExports[0]?.[0];

    // Render story tabs
    renderTabs(storyExports, activeStoryKey || storyExports[0][0]);

    // Render the active story
    if (activeStoryKey) {
      renderStory(mod[activeStoryKey], meta);
    }

    // Render prop controls
    renderControls(meta);

    // Re-render story when props change
    propsStore.subscribe(() => {
      if (activeStoryKey) {
        renderStory(mod[activeStoryKey], meta);
      }
    });
  };

  const renderTabs = (
    storyExports: [string, Function][],
    activeKey: string,
  ) => {
    if (storyExports.length <= 1) {
      $(tabsRef).jsx(<div />);
      return;
    }

    $(tabsRef).jsx(
      <div class="flex gap-1 px-4 pt-3">
        {storyExports.map(([name]) => (
          <button
            key={name}
            class={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              name === activeKey
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => {
              window.location.hash = `${storyId}/${name.toLowerCase()}`;
            }}
          >
            {formatStoryName(name)}
          </button>
        ))}
      </div>,
    );
  };

  const renderStory = (storyFn: Function, meta: any) => {
    try {
      const mergedProps = { ...(meta.args || {}), ...propsStore.value };
      // If the story function accepts args, pass them
      const result = storyFn.length > 0 ? storyFn(mergedProps) : storyFn();
      $(previewRef).jsx(
        <div class="sb-preview">
          <div class="border rounded-lg p-8 min-h-[200px] flex items-center justify-center bg-background">
            {result}
          </div>
        </div>,
      );
    } catch (err: any) {
      $(previewRef).jsx(
        <div class="sb-preview">
          <div class="text-red-500">
            <p class="font-semibold">Error rendering story:</p>
            <pre class="mt-2 text-sm bg-muted p-3 rounded overflow-auto">
              {String(err)}
            </pre>
          </div>
        </div>,
      );
    }

    // Show source code
    try {
      const source = storyFn.toString();
      $(sourceRef).jsx(
        <details class="px-6 pb-4">
          <summary class="text-sm text-muted-foreground cursor-pointer py-2 select-none">
            View Source
          </summary>
          <pre class="mt-2 text-sm bg-muted p-4 rounded-lg overflow-auto">
            <code>{source}</code>
          </pre>
        </details>,
      );
    } catch {
      $(sourceRef).jsx(<div />);
    }
  };

  const renderControls = (meta: any) => {
    if (!meta.argTypes && !meta.args && !meta.component) {
      $(controlsRef).jsx(<div />);
      return;
    }

    $(controlsRef).jsx(
      <div class="sb-controls">
        <PropEditor meta={meta} propsStore={propsStore} />
      </div>,
    );
  };

  return (
    <div onMount={onMount}>
      <div ref={headerRef} />
      <div ref={tabsRef} />
      <div ref={previewRef}>
        <div class="flex items-center justify-center h-64 text-muted-foreground">
          Loading story...
        </div>
      </div>
      <div ref={sourceRef} />
      <div ref={controlsRef} />
    </div>
  );
};

/** Extract named story exports from a module (everything except meta, default, and non-functions) */
function getStoryExports(mod: any): [string, Function][] {
  return Object.entries(mod).filter(
    ([name, value]) =>
      typeof value === "function" &&
      name !== "default" &&
      name !== "meta" &&
      !name.startsWith("_"),
  ) as [string, Function][];
}

/** Convert PascalCase/camelCase story name to readable label */
function formatStoryName(name: string): string {
  return name
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}
