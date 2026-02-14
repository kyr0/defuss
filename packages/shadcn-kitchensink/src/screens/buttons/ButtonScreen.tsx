import type { FC } from "defuss";
import { Button } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";
import { CodeBlock } from "../../components/CodeBlock.js";

export const ButtonScreen: FC = () => {
    return (
        <div class="space-y-6">
            <div class="space-y-2">
                <h1 class="text-3xl font-bold tracking-tight">Button</h1>
                <p class="text-lg text-muted-foreground">
                    Displays a button or a component that looks like a button.
                </p>
            </div>

            <CodePreview
                code={`<Button>Button</Button>`}
                language="tsx"
            >
                <Button>Button</Button>
            </CodePreview>

            <h2 id="usage" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 first:mt-0">Usage</h2>
            <section class="prose dark:prose-invert max-w-none">
                <p>You can use the <code>Button</code> component or styling classes:</p>

                <ul class="list-disc pl-6 space-y-2">
                    <li>
                        <b>Variants</b>:
                        <ul class="list-disc pl-6 mt-2">
                            <li><code>default</code> (or <code>btn-primary</code>)</li>
                            <li><code>secondary</code> (or <code>btn-secondary</code>)</li>
                            <li><code>destructive</code> (or <code>btn-destructive</code>)</li>
                            <li><code>outline</code> (or <code>btn-outline</code>)</li>
                            <li><code>ghost</code> (or <code>btn-ghost</code>)</li>
                            <li><code>link</code> (or <code>btn-link</code>)</li>
                        </ul>
                    </li>
                    <li>
                        <b>Sizes</b>:
                        <ul class="list-disc pl-6 mt-2">
                            <li><code>sm</code> (or <code>btn-sm</code>)</li>
                            <li><code>lg</code> (or <code>btn-lg</code>)</li>
                            <li><code>icon</code> (or <code>btn-icon</code>)</li>
                        </ul>
                    </li>
                </ul>
            </section>

            <CodeBlock code={`import { Button } from "defuss-shadcn"

export const MyComponent = () => (
  <Button variant="outline">Click me</Button>
)`} language="tsx" />


            <h2 id="examples" class="text-3xl font-semibold tracking-tight scroll-m-20 border-b pb-2"><a href="#examples">Examples</a></h2>

            <h3 id="example-primary" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-primary">Primary</a></h3>
            <CodePreview code={`<Button>Primary</Button>`} language="tsx">
                <Button>Primary</Button>
            </CodePreview>

            <h3 id="example-secondary" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-secondary">Secondary</a></h3>
            <CodePreview code={`<Button variant="secondary">Button</Button>`} language="tsx">
                <Button variant="secondary">Button</Button>
            </CodePreview>

            <h3 id="example-destructive" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-destructive">Destructive</a></h3>
            <CodePreview code={`<Button variant="destructive">Destructive</Button>`} language="tsx">
                <Button variant="destructive">Destructive</Button>
            </CodePreview>

            <h3 id="example-outline" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-outline">Outline</a></h3>
            <CodePreview code={`<Button variant="outline">Outline</Button>`} language="tsx">
                <Button variant="outline">Outline</Button>
            </CodePreview>

            <h3 id="example-ghost" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-ghost">Ghost</a></h3>
            <CodePreview code={`<Button variant="ghost">Ghost</Button>`} language="tsx">
                <Button variant="ghost">Ghost</Button>
            </CodePreview>

            <h3 id="example-link" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-link">Link</a></h3>
            <CodePreview code={`<Button variant="link">Link</Button>`} language="tsx">
                <Button variant="link">Link</Button>
            </CodePreview>

            <h3 id="example-icon" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-icon">Icon</a></h3>
            <CodePreview code={`<Button variant="outline" size="icon">
  <ChevronRight className="h-4 w-4" />
</Button>`} language="tsx">
                <Button variant="outline" size="icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right h-4 w-4"><path d="m9 18 6-6-6-6" /></svg>
                </Button>
            </CodePreview>

            <h3 id="example-with-icon" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-with-icon">With Icon</a></h3>
            <CodePreview code={`<Button>
  <Send className="mr-2 h-4 w-4" />
  Send email
</Button>`} language="tsx">
                <Button>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-send mr-2 h-4 w-4"><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></svg>
                    Send email
                </Button>
            </CodePreview>

            <h3 id="example-loading" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-loading">Loading</a></h3>
            <CodePreview code={`<Button variant="outline" disabled>
  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
  Loading
</Button>`} language="tsx">
                <Button variant="outline" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-loader-2 mr-2 h-4 w-4 animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                    Loading
                </Button>
            </CodePreview>

            <h3 id="example-large" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-large">Large</a></h3>
            <CodePreview code={`<Button size="lg">
  <ShoppingCart className="mr-2 h-5 w-5" />
  Buy
</Button>`} language="tsx">
                <Button size="lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shopping-cart mr-2 h-5 w-5"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
                    Buy
                </Button>
            </CodePreview>

            <h3 id="example-small" class="text-xl font-semibold tracking-tight scroll-m-20"><a href="#example-small">Small</a></h3>
            <CodePreview code={`<Button variant="destructive" size="icon-sm">
 <Trash className="h-4 w-4" />
</Button>`} language="tsx">
                <Button variant="destructive" size="icon-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash h-4 w-4"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                </Button>
            </CodePreview>
        </div>
    );
};
