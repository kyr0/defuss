import type { FC } from "defuss";
import { Badge } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";
import { CodeBlock } from "../../components/CodeBlock.js";

export const BadgeScreen: FC = () => {
    return (
        <div class="space-y-6">
            <div class="space-y-2">
                <h1 class="text-3xl font-bold tracking-tight">Badge</h1>
                <p class="text-lg text-muted-foreground">
                    Displays a badge or a component that looks like a badge.
                </p>
            </div>

            <CodePreview
                code={`<div className="flex flex-wrap gap-2">
  <Badge>Badge</Badge>
  <Badge variant="secondary">Secondary</Badge>
  <Badge variant="destructive">Destructive</Badge>
  <Badge variant="outline">Outline</Badge>
</div>`}
                language="tsx"
            >
                <div class="flex flex-wrap gap-2">
                    <Badge>Badge</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                </div>
            </CodePreview>

                        <CodePreview code={`<div className="flex flex-col items-center gap-2">
    <div className="flex w-full flex-wrap gap-2">
        <span className="badge">Badge</span>
        <span className="badge-secondary">Secondary</span>
        <span className="badge-destructive">Destructive</span>
        <span className="badge-outline">Outline</span>
    </div>
    <div className="flex w-full flex-wrap gap-2">
        <span className="badge-secondary bg-blue-500 text-white dark:bg-blue-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></svg>
            Verified
        </span>
        <span className="badge rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">8</span>
        <span className="badge-destructive rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">99</span>
        <span className="badge-outline rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">20+</span>
    </div>
</div>`} language="tsx">
                                <div class="flex flex-col items-center gap-2">
                                        <div class="flex w-full flex-wrap gap-2">
                                                <span class="badge">Badge</span>
                                                <span class="badge-secondary">Secondary</span>
                                                <span class="badge-destructive">Destructive</span>
                                                <span class="badge-outline">Outline</span>
                                        </div>
                                        <div class="flex w-full flex-wrap gap-2">
                                                <span class="badge-secondary bg-blue-500 text-white dark:bg-blue-600">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></svg>
                                                        Verified
                                                </span>
                                                <span class="badge rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">8</span>
                                                <span class="badge-destructive rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">99</span>
                                                <span class="badge-outline rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">20+</span>
                                        </div>
                                </div>
                        </CodePreview>

            <h2 id="usage" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 first:mt-0">Usage</h2>
            <section class="prose dark:prose-invert max-w-none">
                <p>Use the <code>Badge</code> component with one of the available variants:</p>
                <ul class="list-disc pl-6 space-y-2">
                    <li><code>default</code></li>
                    <li><code>secondary</code></li>
                    <li><code>destructive</code></li>
                    <li><code>outline</code></li>
                </ul>
            </section>

            <CodeBlock code={`import { Badge } from "defuss-shadcn"

export const MyComponent = () => (
  <Badge variant="outline">New</Badge>
)`} language="tsx" />

            <h2 id="examples" class="text-3xl font-semibold tracking-tight scroll-m-20 border-b pb-2"><a href="#examples">Examples</a></h2>

            <h3 id="example-primary" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-primary">Primary</a></h3>
            <CodePreview code={`<Badge>Primary</Badge>`} language="tsx">
                <Badge>Primary</Badge>
            </CodePreview>

            <h3 id="example-secondary" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-secondary">Secondary</a></h3>
            <CodePreview code={`<Badge variant="secondary">Secondary</Badge>`} language="tsx">
                <Badge variant="secondary">Secondary</Badge>
            </CodePreview>

            <h3 id="example-destructive" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-destructive">Destructive</a></h3>
            <CodePreview code={`<Badge variant="destructive">Destructive</Badge>`} language="tsx">
                <Badge variant="destructive">Destructive</Badge>
            </CodePreview>

            <h3 id="example-outline" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-outline">Outline</a></h3>
            <CodePreview code={`<Badge variant="outline">Outline</Badge>`} language="tsx">
                <Badge variant="outline">Outline</Badge>
            </CodePreview>

            <h3 id="example-with-icon" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-with-icon">With Icon</a></h3>
            <CodePreview code={`<Badge variant="destructive" className="gap-1">
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
  With icon
</Badge>`} language="tsx">
                <Badge variant="destructive" className="gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    With icon
                </Badge>
            </CodePreview>

            <h3 id="example-link" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-link">Link</a></h3>
            <CodePreview code={`<a href="#" className="badge-outline gap-1">
  Link
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
</a>`} language="tsx">
                <a href="#" class="badge-outline gap-1">
                    Link
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </a>
            </CodePreview>
        </div>
    );
};
