import type { FC } from "defuss";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SkeletonScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Skeleton</h1>
      <p class="text-lg text-muted-foreground">
        Used to show placeholders while content is loading.
      </p>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Default</h2>
        <p class="text-sm text-muted-foreground">
          Basic skeleton with default rounded corners.
        </p>
        <CodePreview
          code={`<Skeleton className="h-4 w-[150px]" />`}
          language="tsx"
        >
          <Skeleton className="h-4 w-[150px]" />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Rounded Corners (Circle)</h2>
        <p class="text-sm text-muted-foreground">
          Skeleton with rounded-full for circular placeholders.
        </p>
        <CodePreview
          code={`<Skeleton className="size-10 rounded-full" />`}
          language="tsx"
        >
          <Skeleton className="size-10 rounded-full" />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">With Custom Height/Width</h2>
        <p class="text-sm text-muted-foreground">
          Skeleton with custom dimensions using className.
        </p>
        <CodePreview
          code={`<div class="flex gap-4">
  <Skeleton className="h-16 w-16 rounded-full" />
  <div class="grid gap-2">
    <Skeleton className="h-6 w-[200px]" />
    <Skeleton className="h-4 w-[150px]" />
  </div>
</div>`}
          language="tsx"
        >
          <div class="flex gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div class="grid gap-2">
              <Skeleton className="h-6 w-[200px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          </div>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">In List</h2>
        <p class="text-sm text-muted-foreground">
          Skeleton line items for list placeholders.
        </p>
        <CodePreview
          code={`<div class="space-y-4 w-full max-w-xs">
  <div class="flex items-center gap-4">
    <Skeleton className="size-12 rounded-full flex-shrink-0" />
    <div class="grid gap-2">
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-3 w-[100px]" />
    </div>
  </div>
  <div class="flex items-center gap-4">
    <Skeleton className="size-12 rounded-full flex-shrink-0" />
    <div class="grid gap-2">
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-3 w-[100px]" />
    </div>
  </div>
  <div class="flex items-center gap-4">
    <Skeleton className="size-12 rounded-full flex-shrink-0" />
    <div class="grid gap-2">
      <Skeleton className="h-4 w-[150px]" />
      <Skeleton className="h-3 w-[100px]" />
    </div>
  </div>
</div>`}
          language="tsx"
        >
          <div class="space-y-4 w-full max-w-xs">
            <div class="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full flex-shrink-0" />
              <div class="grid gap-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
            <div class="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full flex-shrink-0" />
              <div class="grid gap-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
            <div class="flex items-center gap-4">
              <Skeleton className="size-12 rounded-full flex-shrink-0" />
              <div class="grid gap-2">
                <Skeleton className="h-4 w-[150px]" />
                <Skeleton className="h-3 w-[100px]" />
              </div>
            </div>
          </div>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">In Card</h2>
        <p class="text-sm text-muted-foreground">
          Skeleton components within Card components.
        </p>
        <CodePreview
          code={`<Card class="w-full max-w-sm">
  <CardHeader>
    <Skeleton className="h-6 w-3/4 mb-2" />
    <Skeleton className="h-4 w-1/2" />
  </CardHeader>
  <CardContent>
    <Skeleton className="aspect-square w-full mb-4 rounded-lg" />
    <Skeleton className="h-4 w-full mb-2" />
    <Skeleton className="h-4 w-5/6 mb-2" />
    <Skeleton className="h-4 w-2/3" />
  </CardContent>
</Card>`}
          language="tsx"
        >
          <Card class="w-full max-w-sm">
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="aspect-square w-full mb-4 rounded-lg" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Different Animation Timing</h2>
        <p class="text-sm text-muted-foreground">
          Skeleton with custom animation duration using inline styles.
        </p>
        <CodePreview
          code={`<div class="grid gap-4 max-w-xl">
  <div class="flex items-center gap-4">
    <Skeleton className="size-12 rounded-full" style={{ animationDuration: '3s' }} />
    <div class="grid gap-2">
      <Skeleton className="h-4 w-[150px]" style={{ animationDuration: '2s' }} />
      <Skeleton className="h-3 w-[100px]" style={{ animationDuration: '4s' }} />
    </div>
  </div>
  <div class="flex items-center gap-4">
    <Skeleton className="size-12 rounded-full" style={{ animationDuration: '2s' }} />
    <div class="grid gap-2">
      <Skeleton className="h-4 w-[150px]" style={{ animationDuration: '3s' }} />
      <Skeleton className="h-3 w-[100px]" style={{ animationDuration: '2.5s' }} />
    </div>
  </div>
</div>`}
          language="tsx"
        >
          <div class="grid gap-4 max-w-xl">
            <div class="flex items-center gap-4">
              <Skeleton
                className="size-12 rounded-full"
                style={{ animationDuration: "3s" }}
              />
              <div class="grid gap-2">
                <Skeleton
                  className="h-4 w-[150px]"
                  style={{ animationDuration: "2s" }}
                />
                <Skeleton
                  className="h-3 w-[100px]"
                  style={{ animationDuration: "4s" }}
                />
              </div>
            </div>
            <div class="flex items-center gap-4">
              <Skeleton
                className="size-12 rounded-full"
                style={{ animationDuration: "2s" }}
              />
              <div class="grid gap-2">
                <Skeleton
                  className="h-4 w-[150px]"
                  style={{ animationDuration: "3s" }}
                />
                <Skeleton
                  className="h-3 w-[100px]"
                  style={{ animationDuration: "2.5s" }}
                />
              </div>
            </div>
          </div>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">With Background Color</h2>
        <p class="text-sm text-muted-foreground">
          Skeleton using bg-accent and animate-pulse on parent.
        </p>
        <CodePreview
          code={`<Skeleton className="h-64 w-full rounded-xl bg-accent" />`}
          language="tsx"
        >
          <Skeleton className="h-64 w-full rounded-xl bg-accent" />
        </CodePreview>
      </div>
    </div>
  );
};
