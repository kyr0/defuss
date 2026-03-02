import type { FC } from "defuss";
import { Button, Toaster, toast } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ToastScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Toast</h1>
      <p class="text-lg text-muted-foreground">
        A concise message that appears temporarily.
      </p>
      <CodePreview
        code={`<>
  <Button onClick={() => toast({ category: "success", title: "Saved", description: "Your changes have been saved." })}>
    Show toast
  </Button>
  <Toaster className="toaster" />
</>`}
        language="tsx"
      >
        <div class="space-y-2">
          <Button
            onClick={() =>
              toast({
                category: "success",
                title: "Saved",
                description: "Your changes have been saved.",
              })
            }
          >
            Show toast
          </Button>
          <Toaster className="toaster" />
        </div>
      </CodePreview>

      <CodePreview
        code={`<>
  <Button onClick={() => toast({ category: "info", title: "Update available", description: "A new version is available for download." })}>
    Show info toast
  </Button>
  <Toaster className="toaster" />
</>`}
        language="tsx"
      >
        <div class="space-y-2">
          <Button
            onClick={() =>
              toast({
                category: "info",
                title: "Update available",
                description: "A new version is available for download.",
              })
            }
          >
            Show info toast
          </Button>
          <Toaster className="toaster" />
        </div>
      </CodePreview>

      <CodePreview
        code={`<>
  <Button onClick={() => toast({ category: "warning", title: "Storage almost full", description: "You are running low on storage space." })}>
    Show warning toast
  </Button>
  <Toaster className="toaster" />
</>`}
        language="tsx"
      >
        <div class="space-y-2">
          <Button
            onClick={() =>
              toast({
                category: "warning",
                title: "Storage almost full",
                description: "You are running low on storage space.",
              })
            }
          >
            Show warning toast
          </Button>
          <Toaster className="toaster" />
        </div>
      </CodePreview>

      <CodePreview
        code={`<>
  <Button onClick={() => toast({ 
    category: "error", 
    title: "Payment failed", 
    description: "Your payment could not be processed.",
    action: {
      label: "Retry"
    }
  })}>
    Show error toast with action
  </Button>
  <Toaster className="toaster" />
</>`}
        language="tsx"
      >
        <div class="space-y-2">
          <Button
            onClick={() =>
              toast({
                category: "error",
                title: "Payment failed",
                description: "Your payment could not be processed.",
                action: {
                  label: "Retry",
                },
              })
            }
          >
            Show error toast with action
          </Button>
          <Toaster className="toaster" />
        </div>
      </CodePreview>

      <CodePreview
        code={`<>
  <Button onClick={() => toast({ 
    category: "success", 
    title: "Draft saved", 
    description: "Your draft has been saved.",
    duration: 5000
  })}>
    Show custom duration toast
  </Button>
  <Toaster className="toaster" />
</>`}
        language="tsx"
      >
        <div class="space-y-2">
          <Button
            onClick={() =>
              toast({
                category: "success",
                title: "Draft saved",
                description: "Your draft has been saved.",
                duration: 5000,
              })
            }
          >
            Show custom duration toast
          </Button>
          <Toaster className="toaster" />
        </div>
      </CodePreview>

      <CodePreview
        code={`<>
  <Button onClick={() => {
    toast({ category: "success", title: "Task 1", description: "First task completed" });
    setTimeout(() => {
      toast({ category: "info", title: "Task 2", description: "Second task completed" });
    }, 100);
    setTimeout(() => {
      toast({ category: "warning", title: "Task 3", description: "Third task completed" });
    }, 200);
  }}>
    Show multiple concurrent toasts
  </Button>
  <Toaster className="toaster" />
</>`}
        language="tsx"
      >
        <div class="space-y-2">
          <Button
            onClick={() => {
              toast({
                category: "success",
                title: "Task 1",
                description: "First task completed",
              });
              setTimeout(() => {
                toast({
                  category: "info",
                  title: "Task 2",
                  description: "Second task completed",
                });
              }, 100);
              setTimeout(() => {
                toast({
                  category: "warning",
                  title: "Task 3",
                  description: "Third task completed",
                });
              }, 200);
            }}
          >
            Show multiple concurrent toasts
          </Button>
          <Toaster className="toaster" />
        </div>
      </CodePreview>
    </div>
  );
};
