import { type FC, createRef, $ } from "defuss";
import { storyImporters } from "./App.js";

interface DocViewProps {
  storyId: string;
}

export const DocView: FC<DocViewProps> = ({ storyId }) => {
  const contentRef = createRef<HTMLDivElement>();

  const onMount = async () => {
    const importer = storyImporters[storyId];
    if (!importer) {
      $(contentRef).jsx(
        <div class="text-red-500">No importer found for doc: {storyId}</div>,
      );
      return;
    }

    try {
      const mod = await importer();
      const Content = mod.default;
      const meta = mod.meta || {};

      $(contentRef).jsx(
        <div class="sb-preview">
          <article class="sb-prose max-w-none">
            {meta.title && <h1>{meta.title}</h1>}
            <Content />
          </article>
        </div>,
      );
    } catch (err: any) {
      $(contentRef).jsx(
        <div class="sb-preview text-red-500">
          <p class="font-semibold">Failed to load documentation:</p>
          <pre class="mt-2 text-sm bg-muted p-3 rounded overflow-auto">
            {String(err)}
          </pre>
        </div>,
      );
    }
  };

  return (
    <div ref={contentRef} onMount={onMount}>
      <div class="flex items-center justify-center h-64 text-muted-foreground">
        Loading documentation...
      </div>
    </div>
  );
};
