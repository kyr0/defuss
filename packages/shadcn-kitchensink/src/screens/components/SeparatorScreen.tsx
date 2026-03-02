import type { FC } from "defuss";
import { Separator } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SeparatorScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Separator</h1>
      <p class="text-lg text-muted-foreground">
        Visually or semantically separates content.
      </p>

      <h2
        id="horizontal"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Horizontal
      </h2>
      <CodePreview
        code={`<div class="flex flex-col gap-4">
  <div class="flex flex-col gap-2">
    <h3 class="text-lg font-medium">Section 1</h3>
    <p class="text-sm text-muted-foreground">Content for section 1</p>
  </div>
  <Separator />
  <div class="flex flex-col gap-2">
    <h3 class="text-lg font-medium">Section 2</h3>
    <p class="text-sm text-muted-foreground">Content for section 2</p>
  </div>
  <Separator />
  <div class="flex flex-col gap-2">
    <h3 class="text-lg font-medium">Section 3</h3>
    <p class="text-sm text-muted-foreground">Content for section 3</p>
  </div>
</div>`}
        language="tsx"
      >
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2">
            <h3 class="text-lg font-medium">Section 1</h3>
            <p class="text-sm text-muted-foreground">Content for section 1</p>
          </div>
          <Separator />
          <div class="flex flex-col gap-2">
            <h3 class="text-lg font-medium">Section 2</h3>
            <p class="text-sm text-muted-foreground">Content for section 2</p>
          </div>
          <Separator />
          <div class="flex flex-col gap-2">
            <h3 class="text-lg font-medium">Section 3</h3>
            <p class="text-sm text-muted-foreground">Content for section 3</p>
          </div>
        </div>
      </CodePreview>
    </div>
  );
};
