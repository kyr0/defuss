import { type FC, createRef } from "defuss";
import { Button } from "defuss-shadcn";

export interface CodeBlockProps {
    code: string;
    language?: string;
    className?: string;
}

export const CodeBlock: FC<CodeBlockProps> = ({ code, language = "html", className }) => {
    const codeRef = createRef<HTMLElement>();

    const onMount = () => {
        const highlight = () => {
            if (codeRef.current && window.hljs) {
                // Check if already highlighted to avoid double-processing
                if (codeRef.current.dataset.highlighted) return;

                window.hljs.highlightElement(codeRef.current);
            }
        };

        if (window.hljs) {
            highlight();
        } else {
            // Poll for hljs availability (since script is deferred/async)
            const checkInterval = setInterval(() => {
                if (window.hljs) {
                    highlight();
                    clearInterval(checkInterval);
                }
            }, 50);

            // Timeout after 5 seconds
            setTimeout(() => clearInterval(checkInterval), 5000);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code).then(() => {
            const btn = document.getElementById(copyBtnId);
            if (btn) {
                btn.classList.add('copied');
                setTimeout(() => btn.classList.remove('copied'), 2000);
            }
        }).catch(console.error);
    };

    const copyBtnId = `copy-btn-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <div class={`relative ${className || "my-4"}`} onMount={onMount}>
            <pre class="grid text-sm max-h-[650px] overflow-y-auto rounded-xl scrollbar">
                <code ref={codeRef} class={`language-${language} bg-muted/40! p-3.5!`}>
                    {code}
                </code>
            </pre>

            <Button
                id={copyBtnId}
                variant="ghost"
                size="icon"
                className="size-8 absolute right-2.5 top-2 text-muted-foreground hover:text-foreground group"
                onClick={copyToClipboard}
            >
                <div class="group-[.copied]:hidden">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                </div>
                <div class="hidden group-[.copied]:block">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
            </Button>
        </div>
    );
};
