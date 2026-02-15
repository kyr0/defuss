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
      />

      <h2
        id="vertical"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Vertical
      </h2>
      <CodePreview
        code={`<div class="flex items-center gap-4">
  <div class="flex flex-col gap-1">
    <p class="text-sm font-medium">Profile</p>
    <p class="text-xs text-muted-foreground">Account settings</p>
  </div>
  <Separator orientation="vertical" />
  <div class="flex flex-col gap-1">
    <p class="text-sm font-medium">Settings</p>
    <p class="text-xs text-muted-foreground">Preferences</p>
  </div>
  <Separator orientation="vertical" />
  <div class="flex flex-col gap-1">
    <p class="text-sm font-medium">Help</p>
    <p class="text-xs text-muted-foreground">Support center</p>
  </div>
</div>`}
        language="tsx"
      >
        <div class="flex items-center gap-4">
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Profile</p>
            <p class="text-xs text-muted-foreground">Account settings</p>
          </div>
          <Separator orientation="vertical" />
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Settings</p>
            <p class="text-xs text-muted-foreground">Preferences</p>
          </div>
          <Separator orientation="vertical" />
          <div class="flex flex-col gap-1">
            <p class="text-sm font-medium">Help</p>
            <p class="text-xs text-muted-foreground">Support center</p>
          </div>
        </div>
      </CodePreview>

      <h2
        id="horizontal-form"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Horizontal in Form
      </h2>
      <CodePreview
        code={`<form class="w-full max-w-md space-y-6">
  <div class="flex items-center justify-between pb-4">
    <h3 class="text-lg font-medium">Profile Information</h3>
    <Separator />
  </div>
  
  <div class="grid gap-3">
    <label for="full-name">Full Name</label>
    <input id="full-name" type="text" placeholder="John Doe" />
  </div>
  
  <Separator orientation="horizontal" />
  
  <div class="grid gap-3">
    <label for="email">Email</label>
    <input id="email" type="email" placeholder="john@example.com" />
  </div>
  
  <button type="submit" class="btn">Save changes</button>
</form>`}
        language="tsx"
      >
        <form class="w-full max-w-md space-y-6">
          <div class="flex items-center justify-between pb-4">
            <h3 class="text-lg font-medium">Profile Information</h3>
            <Separator />
          </div>

          <div class="grid gap-3">
            <label for="full-name">Full Name</label>
            <input id="full-name" type="text" placeholder="John Doe" />
          </div>

          <Separator orientation="horizontal" />

          <div class="grid gap-3">
            <label for="email">Email</label>
            <input id="email" type="email" placeholder="john@example.com" />
          </div>

          <button type="submit" class="btn">
            Save changes
          </button>
        </form>
      </CodePreview>
    </div>
  );
};
