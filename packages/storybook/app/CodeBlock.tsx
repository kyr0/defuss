import { type FC, createRef } from "defuss";

export interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export const CodeBlock: FC<CodeBlockProps> = ({
  code,
  language = "html",
  className,
}) => {
  const codeRef = createRef<HTMLElement>();

  const onMount = () => {
    const highlight = () => {
      if (codeRef.current && window.hljs) {
        if (codeRef.current.dataset.highlighted) return;
        window.hljs.highlightElement(codeRef.current);
      }
    };

    if (window.hljs) {
      highlight();
    } else {
      const checkInterval = setInterval(() => {
        if (window.hljs) {
          highlight();
          clearInterval(checkInterval);
        }
      }, 50);
      setTimeout(() => clearInterval(checkInterval), 5000);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        const btn = document.getElementById(copyBtnId);
        if (btn) {
          btn.classList.add("copied");
          setTimeout(() => btn.classList.remove("copied"), 2000);
        }
      })
      .catch(console.error);
  };

  const copyBtnId = `copy-btn-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div
      class={`relative bg-black rounded-md ${className || "my-4"}`}
      onMount={onMount}
    >
      <pre class="grid text-sm max-h-[650px] overflow-y-auto rounded-md scrollbar">
        <code ref={codeRef} class={`language-${language} p-3.5!`}>
          {code}
        </code>
      </pre>

      <button
        id={copyBtnId}
        class="size-8 absolute right-2.5 top-2 text-foreground rounded-md hover:text-foreground group btn-ghost btn-icon"
        onClick={copyToClipboard}
      >
        <div class="group-[.copied]:hidden">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
        </div>
        <div class="hidden group-[.copied]:block">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
      </button>
    </div>
  );
};
