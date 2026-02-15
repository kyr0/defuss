import type { FC } from "defuss";
import { Badge } from "defuss-shadcn";
import { CodeBlock } from "../../components/CodeBlock.js";
import { CodePreview } from "../../components/CodePreview.js";

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

      <CodePreview
        code={`<div className="flex flex-wrap gap-2">
   <span className="badge-secondary bg-blue-500 text-white dark:bg-blue-600">Blue</span>
   <span className="badge-secondary bg-green-500 text-white dark:bg-green-600">Green</span>
   <span className="badge-secondary bg-red-500 text-white dark:bg-red-600">Red</span>
   <span className="badge-secondary bg-purple-500 text-white dark:bg-purple-600">Purple</span>
   <span className="badge-secondary bg-yellow-500 text-white dark:bg-yellow-600">Yellow</span>
   <span className="badge-secondary bg-orange-500 text-white dark:bg-orange-600">Orange</span>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap gap-2">
          <span class="badge-secondary bg-blue-500 text-white dark:bg-blue-600">
            Blue
          </span>
          <span class="badge-secondary bg-green-500 text-white dark:bg-green-600">
            Green
          </span>
          <span class="badge-secondary bg-red-500 text-white dark:bg-red-600">
            Red
          </span>
          <span class="badge-secondary bg-purple-500 text-white dark:bg-purple-600">
            Purple
          </span>
          <span class="badge-secondary bg-yellow-500 text-white dark:bg-yellow-600">
            Yellow
          </span>
          <span class="badge-secondary bg-orange-500 text-white dark:bg-orange-600">
            Orange
          </span>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div className="flex flex-wrap gap-2">
   <span className="badge rounded-full">Pill</span>
   <span className="badge-secondary rounded-full">Pill</span>
   <span className="badge-destructive rounded-full">Pill</span>
   <span className="badge-outline rounded-full">Pill</span>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap gap-2">
          <span class="badge rounded-full">Pill</span>
          <span class="badge-secondary rounded-full">Pill</span>
          <span class="badge-destructive rounded-full">Pill</span>
          <span class="badge-outline rounded-full">Pill</span>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div className="flex flex-wrap gap-2">
   <span className="badge rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">5</span>
   <span className="badge-secondary rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">12</span>
   <span className="badge-destructive rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">99</span>
   <span className="badge-outline rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">100+</span>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap gap-2">
          <span class="badge rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">
            5
          </span>
          <span class="badge-secondary rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">
            12
          </span>
          <span class="badge-destructive rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">
            99
          </span>
          <span class="badge-outline rounded-full h-5 min-w-5 px-1 font-mono tabular-nums">
            100+
          </span>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div className="flex flex-wrap gap-2">
   <span className="badge-outline">Outline</span>
   <span className="badge-secondary badge-outline">Secondary</span>
   <span className="badge-destructive badge-outline">Destructive</span>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap gap-2">
          <span class="badge-outline">Outline</span>
          <span class="badge-secondary badge-outline">Secondary</span>
          <span class="badge-destructive badge-outline">Destructive</span>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div className="flex flex-wrap gap-2">
   <span className="badge text-xs px-1.5 py-0.5">XS</span>
   <span className="badge text-sm px-2 py-1">SM</span>
   <span className="badge">MD (default)</span>
   <span className="badge text-lg px-3 py-1.5">LG</span>
   <span className="badge text-xl px-3.5 py-2">XL</span>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap gap-2">
          <span class="badge text-xs px-1.5 py-0.5">XS</span>
          <span class="badge text-sm px-2 py-1">SM</span>
          <span class="badge">MD (default)</span>
          <span class="badge text-lg px-3 py-1.5">LG</span>
          <span class="badge text-xl px-3.5 py-2">XL</span>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div className="flex flex-wrap items-center gap-2">
   <span className="badge relative gap-1">
     <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
     Active
   </span>
   <span className="badge-secondary relative gap-1 rounded-full">
     <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
     Verified
   </span>
   <span className="badge-destructive relative gap-1 rounded-full">
     <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
     Critical
   </span>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="badge relative gap-1">
            <span class="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
            Active
          </span>
          <span class="badge-secondary relative gap-1 rounded-full">
            <span class="absolute right-0 top-0 h-2 w-2 rounded-full bg-green-500 ring-2 ring-background" />
            Verified
          </span>
          <span class="badge-destructive relative gap-1 rounded-full">
            <span class="absolute right-0 top-0 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
            Critical
          </span>
        </div>
      </CodePreview>

      <h2
        id="usage"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 first:mt-0"
      >
        Usage
      </h2>
      <section class="prose dark:prose-invert max-w-none">
        <p>
          Use the <code>Badge</code> component with one of the available
          variants:
        </p>
        <ul class="list-disc pl-6 space-y-2">
          <li>
            <code>default</code>
          </li>
          <li>
            <code>secondary</code>
          </li>
          <li>
            <code>destructive</code>
          </li>
          <li>
            <code>outline</code>
          </li>
        </ul>
      </section>

      <CodeBlock
        code={`import { Badge } from "defuss-shadcn"

export const MyComponent = () => (
  <Badge variant="outline">New</Badge>
)`}
        language="tsx"
      />

      <h2
        id="examples"
        class="text-3xl font-semibold tracking-tight scroll-m-20 border-b pb-2"
      >
        <a href="#examples">Examples</a>
      </h2>

      <h3
        id="example-primary"
        class="text-xl font-semibold tracking-tight scroll-m-20"
      >
        <a href="#example-primary">Primary</a>
      </h3>
      <CodePreview code={`<Badge>Primary</Badge>`} language="tsx">
        <Badge>Primary</Badge>
      </CodePreview>

      <h3
        id="example-secondary"
        class="text-xl font-semibold tracking-tight scroll-m-20"
      >
        <a href="#example-secondary">Secondary</a>
      </h3>
      <CodePreview
        code={`<Badge variant="secondary">Secondary</Badge>`}
        language="tsx"
      >
        <Badge variant="secondary">Secondary</Badge>
      </CodePreview>

      <h3
        id="example-destructive"
        class="text-xl font-semibold tracking-tight scroll-m-20"
      >
        <a href="#example-destructive">Destructive</a>
      </h3>
      <CodePreview
        code={`<Badge variant="destructive">Destructive</Badge>`}
        language="tsx"
      >
        <Badge variant="destructive">Destructive</Badge>
      </CodePreview>

      <h3
        id="example-outline"
        class="text-xl font-semibold tracking-tight scroll-m-20"
      >
        <a href="#example-outline">Outline</a>
      </h3>
      <CodePreview
        code={`<Badge variant="outline">Outline</Badge>`}
        language="tsx"
      >
        <Badge variant="outline">Outline</Badge>
      </CodePreview>

      <h3
        id="example-with-icon"
        class="text-xl font-semibold tracking-tight scroll-m-20"
      >
        <a href="#example-with-icon">With Icon</a>
      </h3>
      <CodePreview
        code={`<Badge variant="destructive" className="gap-1">
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
  With icon
</Badge>`}
        language="tsx"
      >
        <Badge variant="destructive" className="gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          With icon
        </Badge>
      </CodePreview>

      <h3
        id="example-link"
        class="text-xl font-semibold tracking-tight scroll-m-20"
      >
        <a href="#example-link">Link</a>
      </h3>
      <CodePreview
        code={`<a href="#" className="badge-outline gap-1">
  Link
  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
</a>`}
        language="tsx"
      >
        <a href="#" class="badge-outline gap-1">
          Link
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-3.5 w-3.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </a>
      </CodePreview>
    </div>
  );
};
