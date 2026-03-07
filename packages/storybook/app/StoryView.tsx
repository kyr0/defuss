import { type FC, createRef, createStore, $ } from "defuss";
import { storyImporters, manifest, storySources } from "./App.js";
import { PropEditor } from "./PropEditor.js";
import { CodePreview } from "./CodePreview.js";
import { viewportStore } from "./ViewportControls.js";

interface StoryViewProps {
  storyId: string;
  storyName?: string | null;
}

export const StoryView: FC<StoryViewProps> = ({ storyId }) => {
  const containerRef = createRef<HTMLDivElement>();
  const playgroundPreviewRef = createRef<HTMLDivElement>();
  const propsStore = createStore<Record<string, unknown>>({});

  let currentMeta: any = {};

  const onMount = async () => {
    const importer = storyImporters[storyId];
    if (!importer) {
      $(containerRef).jsx(
        <div class="text-red-500 p-6">No importer found for story: {storyId}</div>,
      );
      return;
    }

    let mod: any;
    try {
      mod = await importer();
    } catch (err: any) {
      $(containerRef).jsx(
        <div class="text-red-500 p-6">
          <p class="font-semibold">Failed to load story module:</p>
          <pre class="mt-2 text-sm bg-muted p-3 rounded overflow-auto">{String(err)}</pre>
        </div>,
      );
      return;
    }

    const meta = mod.meta || mod.default?.meta || {};
    currentMeta = meta;
    const storyExports = getStoryExports(mod);

    if (storyExports.length === 0) {
      $(containerRef).jsx(
        <div class="text-muted-foreground italic p-6">
          No story exports found. Export named functions from your .storybook.tsx file.
        </div>,
      );
      return;
    }

    // Set up initial props from meta.args
    if (meta.args) {
      propsStore.set({ ...meta.args });
    }

    // Get raw source code for this story
    const rawSource = (storySources as Record<string, string>)[storyId] || "";

    // Find the playground story: look for "Default" by name, or the first one that accepts args
    const defaultEntry = findPlaygroundStory(storyExports);
    const variantEntries = storyExports.filter(([name]) => name !== defaultEntry[0]);

    // Render the full layout once
    renderLayout(defaultEntry, variantEntries, meta, rawSource);

    // Only re-render the playground preview content on prop/viewport changes
    propsStore.subscribe(() => renderPlaygroundContent(defaultEntry, meta));
    viewportStore.subscribe(() => renderPlaygroundContent(defaultEntry, meta));
  };

  /** Re-render just the playground preview content (not the CodePreview wrapper or PropEditor) */
  const renderPlaygroundContent = (
    [, defaultFn]: [string, Function],
    meta: any,
  ) => {
    const mergedProps = { ...(meta.args || {}), ...propsStore.value };
    let result: any;
    try {
      result = defaultFn.length > 0 ? defaultFn(mergedProps) : defaultFn();
    } catch (err: any) {
      $(playgroundPreviewRef).jsx(
        <div class="text-red-500 p-4">
          <pre class="text-sm">{String(err)}</pre>
        </div>,
      );
      return;
    }

    const { width, height, isConstrained } = viewportStore.value;
    const style: Record<string, string> = {};
    if (isConstrained && width > 0) style.width = `${width}px`;
    if (isConstrained && height > 0) style.height = `${height}px`;

    $(playgroundPreviewRef).jsx(
      <div class="sb-preview-frame" style={isConstrained ? style : undefined}>
        {result}
      </div>,
    );
  };

  /** Render the full page layout (called once on mount) */
  const renderLayout = (
    defaultEntry: [string, Function],
    variantEntries: [string, Function][],
    meta: any,
    rawSource: string,
  ) => {
    const entry = manifest.find((e: any) => e.id === storyId);
    const displayTitle = meta.title || entry?.title || storyId;
    const [defaultKey, defaultFn] = defaultEntry;

    // Render initial default story
    const mergedProps = { ...(meta.args || {}), ...propsStore.value };
    let defaultResult: any;
    let defaultError: string | null = null;
    try {
      defaultResult = defaultFn.length > 0 ? defaultFn(mergedProps) : defaultFn();
    } catch (err: any) {
      defaultError = String(err);
    }

    const { width, height, isConstrained } = viewportStore.value;
    const previewStyle: Record<string, string> = {};
    if (isConstrained && width > 0) previewStyle.width = `${width}px`;
    if (isConstrained && height > 0) previewStyle.height = `${height}px`;

    const defaultSource = extractStorySource(rawSource, defaultKey);
    const hasControls = !!(meta.argTypes || meta.args || meta.component);

    $(containerRef).jsx(
      <div class="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 class="text-xl font-semibold">{displayTitle}</h1>
          {meta.description && (
            <p class="text-sm text-muted-foreground mt-1">{meta.description}</p>
          )}
        </div>

        {/* Playground section */}
        <section>
          <h2 class="text-base font-semibold mb-3">Playground</h2>
          <CodePreview code={defaultSource} language="tsx">
            <div ref={playgroundPreviewRef}>
              {defaultError ? (
                <div class="text-red-500 p-4">
                  <pre class="text-sm">{defaultError}</pre>
                </div>
              ) : (
                <div class="sb-preview-frame" style={isConstrained ? previewStyle : undefined}>
                  {defaultResult}
                </div>
              )}
            </div>
          </CodePreview>

          {/* Prop controls (only for playground) */}
          {hasControls && (
            <div class="mt-4">
              <PropEditor meta={meta} propsStore={propsStore} />
            </div>
          )}
        </section>

        {/* Divider + Variants */}
        {variantEntries.length > 0 && (
          <>
            <hr class="border-border" />
            {variantEntries.map(([name, fn]) => {
              const variantSource = extractStorySource(rawSource, name);
              const description = extractJSDocComment(rawSource, name);
              let result: any;
              let error: string | null = null;
              try {
                result = fn();
              } catch (err: any) {
                error = String(err);
              }

              return (
                <section key={name}>
                  <h2 class="text-base font-semibold">{formatStoryName(name)}</h2>
                  {description && (
                    <p class="text-sm text-muted-foreground mt-0.5 mb-3">{description}</p>
                  )}
                  {error ? (
                    <div class="text-red-500">
                      <pre class="text-sm bg-muted p-3 rounded overflow-auto">{error}</pre>
                    </div>
                  ) : (
                    <CodePreview code={variantSource} language="tsx">
                      <div class="sb-preview-frame">
                        {result}
                      </div>
                    </CodePreview>
                  )}
                </section>
              );
            })}
          </>
        )}
      </div>,
    );
  };

  return (
    <div ref={containerRef} onMount={onMount}>
      <div class="flex items-center justify-center h-64 text-muted-foreground">
        Loading story...
      </div>
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

/**
 * Find the story to use for the Playground.
 * Priority: export named "Default" > first export that accepts args > first export.
 */
function findPlaygroundStory(exports: [string, Function][]): [string, Function] {
  const byName = exports.find(([name]) => name.toLowerCase() === "default");
  if (byName) return byName;
  const withArgs = exports.find(([, fn]) => fn.length > 0);
  if (withArgs) return withArgs;
  return exports[0];
}

/**
 * Extract the source code of a single exported story function from the raw file.
 * Looks for `export const Name = ...` and captures until the next export or end of file.
 */
function extractStorySource(rawSource: string, storyName: string): string {
  // Match `export const StoryName = ...` block
  const pattern = new RegExp(
    `(?:^|\\n)((?:\\/\\*\\*[\\s\\S]*?\\*\\/\\s*)?export\\s+(?:const|function)\\s+${storyName}\\b[\\s\\S]*?)(?=\\n(?:\\/\\*\\*|export\\s)|$)`,
  );
  const match = rawSource.match(pattern);
  if (match) {
    return match[1].trim();
  }
  // Fallback: return full source
  return rawSource;
}

/**
 * Extract the JSDoc comment immediately before a named export.
 * Returns the text content (without the comment markers) or null.
 */
function extractJSDocComment(rawSource: string, storyName: string): string | null {
  const pattern = new RegExp(
    `\\/\\*\\*\\s*\\n?\\s*\\*\\s*(.+?)\\s*\\n?\\s*\\*\\/\\s*\\nexport\\s+(?:const|function)\\s+${storyName}\\b`,
  );
  const match = rawSource.match(pattern);
  return match ? match[1].trim() : null;
}
