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

      <CodePreview
        code={`<div class="toaster">
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="info">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M11 12h1v4h1" />
        <path d="M12 8v.01" />
      </svg>
      <section>
        <h2>System update</h2>
        <p>A new version is available for download.</p>
      </section>
    </div>
  </div>
</div>`}
        language="html"
      >
        <div class="toaster">
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="info"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M11 12h1v4h1" />
                <path d="M12 8v.01" />
              </svg>
              <section>
                <h2>System update</h2>
                <p>A new version is available for download.</p>
              </section>
            </div>
          </div>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div class="toaster">
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="warning" data-duration="5000">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <section>
        <h2>Storage almost full</h2>
        <p>You are running low on storage space.</p>
      </section>
      <footer>
        <button type="button" class="btn" data-toast-action>Upgrade</button>
      </footer>
    </div>
  </div>
</div>`}
        language="html"
      >
        <div class="toaster">
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="warning"
            data-duration="5000"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <section>
                <h2>Storage almost full</h2>
                <p>You are running low on storage space.</p>
              </section>
              <footer>
                <button type="button" class="btn" data-toast-action>
                  Upgrade
                </button>
              </footer>
            </div>
          </div>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div class="toaster">
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="error">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" x2="9" y1="9" y2="15" />
        <line x1="9" x2="15" y1="9" y2="15" />
      </svg>
      <section>
        <h2>Payment failed</h2>
        <p>Your payment could not be processed.</p>
      </section>
      <footer>
        <button type="button" class="btn-outline" data-toast-action>Dismiss</button>
        <button type="button" class="btn" data-toast-action>Retry</button>
      </footer>
    </div>
  </div>
</div>`}
        language="html"
      >
        <div class="toaster">
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="error"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="15" x2="9" y1="9" y2="15" />
                <line x1="9" x2="15" y1="9" y2="15" />
              </svg>
              <section>
                <h2>Payment failed</h2>
                <p>Your payment could not be processed.</p>
              </section>
              <footer>
                <button type="button" class="btn-outline" data-toast-action>
                  Dismiss
                </button>
                <button type="button" class="btn" data-toast-action>
                  Retry
                </button>
              </footer>
            </div>
          </div>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div class="toaster">
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="success" data-duration="5000">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <section>
        <h2>Draft saved</h2>
        <p>Your draft has been saved.</p>
      </section>
    </div>
  </div>
</div>`}
        language="html"
      >
        <div class="toaster">
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="success"
            data-duration="5000"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <section>
                <h2>Draft saved</h2>
                <p>Your draft has been saved.</p>
              </section>
            </div>
          </div>
        </div>
      </CodePreview>

      <CodePreview
        code={`<div class="toaster">
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="success">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m9 12 2 2 4-4" />
      </svg>
      <section>
        <h2>Task 1 completed</h2>
        <p>First task completed successfully</p>
      </section>
    </div>
  </div>
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="info">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M11 12h1v4h1" />
        <path d="M12 8v.01" />
      </svg>
      <section>
        <h2>Task 2 completed</h2>
        <p>Second task completed successfully</p>
      </section>
    </div>
  </div>
  <div class="toast" role="status" aria-atomic="true" aria-hidden="false" data-category="warning" data-duration="5000">
    <div class="toast-content">
      <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <section>
        <h2>Task 3 completed</h2>
        <p>Third task completed successfully</p>
      </section>
    </div>
  </div>
</div>`}
        language="html"
      >
        <div class="toaster">
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="success"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              <section>
                <h2>Task 1 completed</h2>
                <p>First task completed successfully</p>
              </section>
            </div>
          </div>
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="info"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M11 12h1v4h1" />
                <path d="M12 8v.01" />
              </svg>
              <section>
                <h2>Task 2 completed</h2>
                <p>Second task completed successfully</p>
              </section>
            </div>
          </div>
          <div
            class="toast"
            role="status"
            aria-atomic="true"
            aria-hidden="false"
            data-category="warning"
            data-duration="5000"
          >
            <div class="toast-content">
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
              <section>
                <h2>Task 3 completed</h2>
                <p>Third task completed successfully</p>
              </section>
            </div>
          </div>
        </div>
      </CodePreview>
    </div>
  );
};
