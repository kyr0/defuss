import type { FC } from "defuss";
import { Button, Popover, PopoverContent, PopoverTrigger } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const PopoverScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Popover</h1>
      <p class="text-lg text-muted-foreground">
        Displays rich content in a portal, triggered by a button.
      </p>

      <h2
        id="example-basic"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Basic Popover
      </h2>
      <p class="text-muted-foreground">
        The most basic Popover implementation with a button trigger and content
        panel.
      </p>
      <CodePreview
        code={`<Popover>
  <PopoverTrigger className="btn-outline">Open Popover</PopoverTrigger>
  <PopoverContent className="w-80">
    <div className="grid gap-4">
      <header className="grid gap-1.5">
        <h4 className="leading-none font-medium">Dimensions</h4>
        <p className="text-muted-foreground text-sm">Set dimensions for the layer.</p>
      </header>
    </div>
  </PopoverContent>
</Popover>`}
        language="tsx"
      >
        <Popover>
          <PopoverTrigger className="btn-outline">Open Popover</PopoverTrigger>
          <PopoverContent className="w-80">
            <div class="grid gap-4">
              <header class="grid gap-1.5">
                <h4 class="leading-none font-medium">Dimensions</h4>
                <p class="text-muted-foreground text-sm">
                  Set dimensions for the layer.
                </p>
              </header>
            </div>
          </PopoverContent>
        </Popover>
      </CodePreview>

      <h2
        id="example-form"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Popover with Form
      </h2>
      <p class="text-muted-foreground">
        Popovers can contain interactive form elements like inputs and buttons.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        code={`<Popover>
  <PopoverTrigger className="btn-outline">Settings</PopoverTrigger>
  <PopoverContent className="w-80">
    <form className="grid gap-4">
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" className="input mt-1" type="text" placeholder="Your name" />
      </div>
      <div>
        <label htmlFor="email" className="label">Email</label>
        <input id="email" className="input mt-1" type="email" placeholder="your.email@example.com" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-outline">Cancel</button>
        <button type="submit" className="btn">Save</button>
      </div>
    </form>
  </PopoverContent>
</Popover>`}
        language="tsx"
      >
        <Popover>
          <PopoverTrigger className="btn-outline">Settings</PopoverTrigger>
          <PopoverContent className="w-80">
            <form class="grid gap-4">
              <div>
                <label htmlFor="name" class="label">
                  Name
                </label>
                <input
                  id="name"
                  class="input mt-1"
                  type="text"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" class="label">
                  Email
                </label>
                <input
                  id="email"
                  class="input mt-1"
                  type="email"
                  placeholder="your.email@example.com"
                />
              </div>
              <div class="flex justify-end gap-2">
                <button type="button" class="btn-outline">
                  Cancel
                </button>
                <button type="submit" class="btn">
                  Save
                </button>
              </div>
            </form>
          </PopoverContent>
        </Popover>
      </CodePreview>

      <h2
        id="example-nested-content"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Popover with Nested Content
      </h2>
      <p class="text-muted-foreground">
        Popovers can contain complex nested content like card layouts and
        multiple sections.
      </p>
      <CodePreview
        code={`<Popover>
  <PopoverTrigger className="btn-outline">Profile</PopoverTrigger>
  <PopoverContent className="w-96">
    <div className="flex items-center gap-4 p-4 border-b">
      <div className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
        <span className="font-semibold">JD</span>
      </div>
      <div className="grid gap-1">
        <div className="font-semibold">John Doe</div>
        <div className="text-muted-foreground text-sm">john@example.com</div>
      </div>
    </div>
    <div className="grid gap-4 py-4">
      <div className="flex items-center gap-3">
        <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <span className="text-sm">Account Settings</span>
      </div>
      <div className="flex items-center gap-3">
        <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
        <span className="text-sm">Privacy</span>
      </div>
      <div className="flex items-center gap-3">
        <svg className="shrink-0 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <span className="text-sm">Security</span>
      </div>
    </div>
    <div className="border-t pt-4">
      <button className="btn w-full btn-destructive">Sign out</button>
    </div>
  </PopoverContent>
</Popover>`}
        language="tsx"
      >
        <Popover>
          <PopoverTrigger className="btn-outline">Profile</PopoverTrigger>
          <PopoverContent className="w-96">
            <div class="flex items-center gap-4 p-4 border-b">
              <div class="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-full">
                <span class="font-semibold">JD</span>
              </div>
              <div class="grid gap-1">
                <div class="font-semibold">John Doe</div>
                <div class="text-muted-foreground text-sm">
                  john@example.com
                </div>
              </div>
            </div>
            <div class="grid gap-4 py-4">
              <div class="flex items-center gap-3">
                <svg
                  class="shrink-0 size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
                <span class="text-sm">Account Settings</span>
              </div>
              <div class="flex items-center gap-3">
                <svg
                  class="shrink-0 size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <span class="text-sm">Privacy</span>
              </div>
              <div class="flex items-center gap-3">
                <svg
                  class="shrink-0 size-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
                <span class="text-sm">Security</span>
              </div>
            </div>
            <div class="border-t pt-4">
              <button class="btn w-full btn-destructive">Sign out</button>
            </div>
          </PopoverContent>
        </Popover>
      </CodePreview>

      <h2
        id="example-triggers"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Different Trigger Elements
      </h2>
      <p class="text-muted-foreground">
        Popovers can be triggered by various elements beyond buttons.
      </p>
      <div class="flex flex-wrap gap-4">
        <Popover>
          <PopoverTrigger className="btn-icon-outline size-10">
            <svg
              className="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="12" cy="5" r="1" />
              <circle cx="12" cy="19" r="1" />
            </svg>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div class="grid gap-2">
              <div class="font-semibold">Action Menu</div>
              <div class="text-sm">Quick actions available here</div>
            </div>
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger className="font-medium underline hover:text-primary">
            Click me
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div class="grid gap-2">
              <div class="font-semibold">Additional Info</div>
              <div class="text-sm">More details in this popover</div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <CodePreview
        code={`<div class="flex flex-wrap gap-4">
  <Popover>
    <PopoverTrigger className="btn-icon-outline size-10">
      <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="1" />
        <circle cx="12" cy="5" r="1" />
        <circle cx="12" cy="19" r="1" />
      </svg>
    </PopoverTrigger>
    <PopoverContent className="w-48">
      <div className="grid gap-2">
        <div className="font-semibold">Action Menu</div>
        <div className="text-sm">Quick actions available here</div>
      </div>
    </PopoverContent>
  </Popover>
  <Popover>
    <PopoverTrigger className="font-medium underline hover:text-primary">Click me</PopoverTrigger>
    <PopoverContent className="w-64">
      <div className="grid gap-2">
        <div className="font-semibold">Additional Info</div>
        <div className="text-sm">More details in this popover</div>
      </div>
    </PopoverContent>
  </Popover>
</div>`}
        language="tsx"
      >
        <div class="flex flex-wrap gap-4">
          <Popover>
            <PopoverTrigger className="btn-icon-outline size-10">
              <svg
                class="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div class="grid gap-2">
                <div class="font-semibold">Action Menu</div>
                <div class="text-sm">Quick actions available here</div>
              </div>
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger className="font-medium underline hover:text-primary">
              Click me
            </PopoverTrigger>
            <PopoverContent className="w-64">
              <div class="grid gap-2">
                <div class="font-semibold">Additional Info</div>
                <div class="text-sm">More details in this popover</div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </CodePreview>

      <h2
        id="example-alignments"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Different Alignments
      </h2>
      <p class="text-muted-foreground">
        Popovers can be aligned left, center, or right relative to the trigger.
      </p>
      <div class="flex flex-wrap gap-4 justify-center">
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-block">
            <Popover placement="top-start">
              <PopoverTrigger className="btn-outline">Top Start</PopoverTrigger>
              <PopoverContent placement="top-start">
                Top Start Alignment
              </PopoverContent>
            </Popover>
          </div>
          <div class="text-xs text-muted-foreground">Alignment: start</div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-block">
            <Popover placement="top">
              <PopoverTrigger className="btn-outline">
                Top Center
              </PopoverTrigger>
              <PopoverContent placement="top">
                Top Center Alignment
              </PopoverContent>
            </Popover>
          </div>
          <div class="text-xs text-muted-foreground">Alignment: center</div>
        </div>
        <div class="flex flex-col items-center gap-2">
          <div class="relative inline-block">
            <Popover placement="top-end">
              <PopoverTrigger className="btn-outline">Top End</PopoverTrigger>
              <PopoverContent placement="top-end">
                Top End Alignment
              </PopoverContent>
            </Popover>
          </div>
          <div class="text-xs text-muted-foreground">Alignment: end</div>
        </div>
      </div>
    </div>
  );
};
