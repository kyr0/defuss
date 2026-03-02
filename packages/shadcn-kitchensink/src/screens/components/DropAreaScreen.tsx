import { $, createRef, type FC } from "defuss";
import { DropArea } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

const DropIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="text-muted-foreground"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

/** Wire up dragenter/dragleave to swap content with a drop icon */
const useDragOverSwap = (containerRef: ReturnType<typeof createRef<HTMLDivElement>>) => {
  let savedHTML = "";
  let dragCount = 0;

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCount++;
    if (dragCount === 1 && containerRef.current) {
      savedHTML = containerRef.current.innerHTML;
      $(containerRef).html("").jsx(<>
        <DropIcon />
        <p class="text-sm font-medium text-muted-foreground">Drop it!</p>
      </>);
    }
  };

  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragCount--;
    if (dragCount <= 0 && containerRef.current) {
      dragCount = 0;
      containerRef.current.innerHTML = savedHTML;
    }
  };

  const onDrop = (fileNames?: string) => {
    dragCount = 0;
    if (containerRef.current) {
      if (fileNames) {
        $(containerRef).html("").jsx(<>
          <p class="text-sm font-medium text-foreground">{fileNames}</p>
        </>);
      } else {
        containerRef.current.innerHTML = savedHTML;
      }
    }
  };

  return { onDragEnter, onDragLeave, resetOnDrop: onDrop };
};

export const DropAreaScreen: FC = () => {
  const defaultAreaRef = createRef<HTMLDivElement>();
  const smallAreaRef = createRef<HTMLDivElement>();
  const iconAreaRef = createRef<HTMLDivElement>();

  const defaultSwap = useDragOverSwap(defaultAreaRef);
  const smallSwap = useDragOverSwap(smallAreaRef);
  const iconSwap = useDragOverSwap(iconAreaRef);

  const handleDrop =
    (swap: ReturnType<typeof useDragOverSwap>) => (event: DragEvent) => {
      const files = event.dataTransfer?.files;
      if (files && files.length > 0) {
        const names = Array.from(files)
          .map((f) => f.name)
          .join(", ");
        swap.resetOnDrop(names);
      } else {
        swap.resetOnDrop();
      }
    };

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Drop Area</h1>
      <p class="text-lg text-muted-foreground">
        A styled drop zone for file uploads and drag-and-drop interactions.
      </p>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">Default (md)</h2>

      <CodePreview
        code={`const dropInfo = createRef<HTMLParagraphElement>();

<DropArea onDrop={(event) => {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const names = Array.from(files).map((f) => f.name).join(", ");
    dropInfo.render(\`Dropped: \${names}\`);
  }
}}>
  <p class="text-sm font-medium">Drag & drop files here</p>
  <p ref={dropInfo} class="text-xs">or click to browse</p>
</DropArea>`}
        language="tsx"
        className="w-full max-w-md"
      >
        <DropArea ref={defaultAreaRef} onDrop={handleDrop(defaultSwap)} onDragEnter={defaultSwap.onDragEnter} onDragLeave={defaultSwap.onDragLeave}>
          <p class="text-sm font-medium">Drag & drop files here</p>
          <p class="text-xs">
            or click to browse
          </p>
        </DropArea>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">Small (sm)</h2>

      <CodePreview
        code={`const dropInfo = createRef<HTMLParagraphElement>();

<DropArea size="sm" onDrop={(event) => {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    dropInfo.render(\`Dropped: \${files[0].name}\`);
  }
}}>
  <p ref={dropInfo} class="text-sm">Drop file here</p>
</DropArea>`}
        language="tsx"
        className="w-full max-w-md"
      >
        <DropArea size="sm" ref={smallAreaRef} onDrop={handleDrop(smallSwap)} onDragEnter={smallSwap.onDragEnter} onDragLeave={smallSwap.onDragLeave}>
          <p class="text-sm">
            Drop file here
          </p>
        </DropArea>
      </CodePreview>

      <h2 class="text-2xl font-bold tracking-tight mt-8 mb-2">With Icon</h2>

      <CodePreview
        code={`const dropInfo = createRef<HTMLParagraphElement>();

<DropArea onDrop={(event) => {
  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    const names = Array.from(files).map((f) => f.name).join(", ");
    dropInfo.render(\`Dropped: \${names}\`);
  }
}}>
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
  <p class="text-sm font-medium">Upload your files</p>
  <p ref={dropInfo} class="text-xs">PNG, JPG, PDF up to 10MB</p>
</DropArea>`}
        language="tsx"
        className="w-full max-w-md"
      >
        <DropArea ref={iconAreaRef} onDrop={handleDrop(iconSwap)} onDragEnter={iconSwap.onDragEnter} onDragLeave={iconSwap.onDragLeave}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <p class="text-sm font-medium">Upload your files</p>
          <p class="text-xs">
            PNG, JPG, PDF up to 10MB
          </p>
        </DropArea>
      </CodePreview>
    </div>
  );
};
