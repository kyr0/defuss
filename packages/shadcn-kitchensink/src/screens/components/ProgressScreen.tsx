import { createRef, type FC } from "defuss";
import { Progress } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ProgressScreen: FC = () => {
  const indicatorRef = createRef<HTMLDivElement>();

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Progress</h1>
      <p class="text-lg text-muted-foreground">
        Displays an indicator showing task completion progress.
      </p>

      <h2
        id="usage"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2"
      >
        Usage
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-sm"
        code={`<div className="bg-primary/20 relative h-2 w-full overflow-hidden rounded-full">
   <div id="demo-progress" className="bg-primary h-full w-full flex-1 transition-all" style="width: 17%"></div>
 </div>

setTimeout(() => {
  document.getElementById("demo-progress")!.style.width = "66%";
}, 500);`}
        language="tsx"
      >
        <div
          class="bg-primary/20 relative h-2 w-full max-w-sm overflow-hidden rounded-full"
          onMount={() => {
            setTimeout(() => {
              if (indicatorRef.current) {
                indicatorRef.current.style.width = "66%";
              }
            }, 500);
          }}
        >
          <div
            ref={indicatorRef}
            class="bg-primary h-full w-full flex-1 transition-all"
            style="width: 17%"
          />
        </div>
      </CodePreview>

      <h2
        id="example-component"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2"
      >
        With Progress component
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-sm"
        code={`<Progress value={66} className="w-full" />`}
        language="tsx"
      >
        <Progress value={66} className="w-full" />
      </CodePreview>

      <h2
        id="progress-with-label"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Progress with label
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<div class="space-y-2">
  <div className="flex justify-between">
    <span className="text-sm font-medium">Downloading file</span>
    <span className="text-sm text-muted-foreground">66%</span>
  </div>
  <Progress value={66} className="w-full" />
</div>

<div class="space-y-2">
  <label className="text-sm font-medium">Uploading assets</label>
  <Progress value={42} className="w-full" />
</div>`}
        language="tsx"
      >
        <div class="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Downloading file</span>
            <span className="text-sm text-muted-foreground">66%</span>
          </div>
          <Progress value={66} className="w-full" />
        </div>

        <div class="space-y-2">
          <label className="text-sm font-medium">Uploading assets</label>
          <Progress value={42} className="w-full" />
        </div>
      </CodePreview>

      <h2
        id="progress-with-percentage"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Progress with percentage
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<div class="space-y-2">
  <div className="flex justify-between">
    <span className="text-sm font-medium">Processing</span>
    <span className="text-sm font-medium text-primary">66%</span>
  </div>
  <Progress value={66} className="w-full" />
</div>`}
        language="tsx"
      >
        <div class="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Processing</span>
            <span className="text-sm font-medium text-primary">66%</span>
          </div>
          <Progress value={66} className="w-full" />
        </div>
      </CodePreview>

      <h2
        id="progress-with-different-colors"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Progress with different colors
      </h2>
      <CodePreview
        previewClassName="items-start justify-start flex-col gap-6"
        className="w-full max-w-md"
        code={`<div class="space-y-2">
  <div className="flex justify-between">
    <span className="text-sm font-medium">Success</span>
    <span className="text-sm text-muted-foreground">100%</span>
  </div>
  <Progress value={100} className="w-full" class="group">
    <div class="h-full w-full bg-green-500 transition-all" />
  </Progress>
</div>

<div class="space-y-2">
  <div className="flex justify-between">
    <span className="text-sm font-medium">Warning</span>
    <span className="text-sm text-muted-foreground">85%</span>
  </div>
  <Progress value={85} className="w-full" class="group">
    <div class="h-full w-full bg-yellow-500 transition-all" />
  </Progress>
</div>

<div class="space-y-2">
  <div className="flex justify-between">
    <span className="text-sm font-medium">Error</span>
    <span className="text-sm text-muted-foreground">30%</span>
  </div>
  <Progress value={30} className="w-full" class="group">
    <div class="h-full w-full bg-red-500 transition-all" />
  </Progress>
</div>`}
        language="tsx"
      >
        <div class="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Success</span>
            <span className="text-sm text-muted-foreground">100%</span>
          </div>
          <Progress value={100} className="w-full" class="group">
            <div class="h-full w-full bg-green-500 transition-all" />
          </Progress>
        </div>

        <div class="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Warning</span>
            <span className="text-sm text-muted-foreground">85%</span>
          </div>
          <Progress value={85} className="w-full" class="group">
            <div class="h-full w-full bg-yellow-500 transition-all" />
          </Progress>
        </div>

        <div class="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm font-medium">Error</span>
            <span className="text-sm text-muted-foreground">30%</span>
          </div>
          <Progress value={30} className="w-full" class="group">
            <div class="h-full w-full bg-red-500 transition-all" />
          </Progress>
        </div>
      </CodePreview>

      <h2
        id="progress-in-card"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Progress in card
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<div class="rounded-xl border bg-card text-card-foreground shadow-sm">
  <div class="flex flex-col space-y-1.5 p-6">
    <h3 class="text-2xl font-semibold leading-none tracking-tight">Server status</h3>
    <p class="text-sm text-muted-foreground">CPU and memory usage over time</p>
  </div>
  <div class="p-6 pt-0 space-y-4">
    <div class="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium">CPU usage</span>
        <span className="text-sm text-muted-foreground">66%</span>
      </div>
      <Progress value={66} className="w-full" />
    </div>
    <div class="space-y-2">
      <div className="flex justify-between">
        <span className="text-sm font-medium">Memory usage</span>
        <span className="text-sm text-muted-foreground">42%</span>
      </div>
      <Progress value={42} className="w-full" />
    </div>
  </div>
</div>`}
        language="tsx"
      >
        <div class="rounded-xl border bg-card text-card-foreground shadow-sm">
          <div class="flex flex-col space-y-1.5 p-6">
            <h3 class="text-2xl font-semibold leading-none tracking-tight">
              Server status
            </h3>
            <p class="text-sm text-muted-foreground">
              CPU and memory usage over time
            </p>
          </div>
          <div class="p-6 pt-0 space-y-4">
            <div class="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">CPU usage</span>
                <span className="text-sm text-muted-foreground">66%</span>
              </div>
              <Progress value={66} className="w-full" />
            </div>
            <div class="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Memory usage</span>
                <span className="text-sm text-muted-foreground">42%</span>
              </div>
              <Progress value={42} className="w-full" />
            </div>
          </div>
        </div>
      </CodePreview>

      <h2
        id="multiple-progress-bars"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Multiple progress bars side by side
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<div class="space-y-4">
  <div className="flex justify-between items-center">
    <span className="text-sm font-medium">Task progress</span>
    <span className="text-sm text-muted-foreground">4/4 complete</span>
  </div>
  <div class="grid grid-cols-2 gap-4">
    <div class="space-y-2">
      <div className="flex justify-between">
        <span className="text-xs font-medium">Compile</span>
        <span className="text-xs text-muted-foreground">100%</span>
      </div>
      <Progress value={100} className="w-full" />
    </div>
    <div class="space-y-2">
      <div className="flex justify-between">
        <span className="text-xs font-medium">Test</span>
        <span className="text-xs text-muted-foreground">75%</span>
      </div>
      <Progress value={75} className="w-full" />
    </div>
    <div class="space-y-2">
      <div className="flex justify-between">
        <span className="text-xs font-medium">Bundle</span>
        <span className="text-xs text-muted-foreground">50%</span>
      </div>
      <Progress value={50} className="w-full" />
    </div>
    <div class="space-y-2">
      <div className="flex justify-between">
        <span className="text-xs font-medium">Deploy</span>
        <span className="text-xs text-muted-foreground">25%</span>
      </div>
      <Progress value={25} className="w-full" />
    </div>
  </div>
</div>`}
        language="tsx"
      >
        <div class="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Task progress</span>
            <span className="text-sm text-muted-foreground">4/4 complete</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Compile</span>
                <span className="text-xs text-muted-foreground">100%</span>
              </div>
              <Progress value={100} className="w-full" />
            </div>
            <div class="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Test</span>
                <span className="text-xs text-muted-foreground">75%</span>
              </div>
              <Progress value={75} className="w-full" />
            </div>
            <div class="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Bundle</span>
                <span className="text-xs text-muted-foreground">50%</span>
              </div>
              <Progress value={50} className="w-full" />
            </div>
            <div class="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs font-medium">Deploy</span>
                <span className="text-xs text-muted-foreground">25%</span>
              </div>
              <Progress value={25} className="w-full" />
            </div>
          </div>
        </div>
      </CodePreview>

      <h2
        id="progress-with-custom-height"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Progress with custom height
      </h2>
      <CodePreview
        previewClassName="items-start justify-start flex-col gap-6"
        className="w-full max-w-md"
        code={`<div class="space-y-4">
  <div class="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm font-medium">Thin (h-1)</span>
      <span className="text-sm text-muted-foreground">33%</span>
    </div>
    <Progress value={33} className="h-1 w-full" />
  </div>

  <div class="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm font-medium">Default (h-2)</span>
      <span className="text-sm text-muted-foreground">66%</span>
    </div>
    <Progress value={66} className="h-2 w-full" />
  </div>

  <div class="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm font-medium">Large (h-4)</span>
      <span className="text-sm text-muted-foreground">88%</span>
    </div>
    <Progress value={88} className="h-4 w-full" />
  </div>

  <div class="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm font-medium">Extra large (h-6)</span>
      <span className="text-sm text-muted-foreground">100%</span>
    </div>
    <Progress value={100} className="h-6 w-full" />
  </div>
</div>`}
        language="tsx"
      >
        <div class="space-y-4">
          <div class="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Thin (h-1)</span>
              <span className="text-sm text-muted-foreground">33%</span>
            </div>
            <Progress value={33} className="h-1 w-full" />
          </div>

          <div class="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Default (h-2)</span>
              <span className="text-sm text-muted-foreground">66%</span>
            </div>
            <Progress value={66} className="h-2 w-full" />
          </div>

          <div class="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Large (h-4)</span>
              <span className="text-sm text-muted-foreground">88%</span>
            </div>
            <Progress value={88} className="h-4 w-full" />
          </div>

          <div class="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Extra large (h-6)</span>
              <span className="text-sm text-muted-foreground">100%</span>
            </div>
            <Progress value={100} className="h-6 w-full" />
          </div>
        </div>
      </CodePreview>

      <h2
        id="indeterminate-progress"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Indeterminate progress
      </h2>
      <CodePreview
        previewClassName="items-start justify-start flex-col gap-6"
        className="w-full max-w-md"
        code={`<div class="space-y-4">
  <div class="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm font-medium">Processing</span>
      <span className="text-sm text-muted-foreground">Please wait...</span>
    </div>
    <Progress value={null} className="w-full" />
  </div>

  <div class="space-y-2">
    <div className="flex justify-between">
      <span className="text-sm font-medium">Loading assets</span>
      <span className="text-sm text-muted-foreground">---</span>
    </div>
    <Progress value={undefined} className="w-full" />
  </div>
</div>`}
        language="tsx"
      >
        <div class="space-y-4">
          <div class="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Processing</span>
              <span className="text-sm text-muted-foreground">
                Please wait...
              </span>
            </div>
            <Progress value={null} className="w-full" />
          </div>

          <div class="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Loading assets</span>
              <span className="text-sm text-muted-foreground">---</span>
            </div>
            <Progress value={undefined} className="w-full" />
          </div>
        </div>
      </CodePreview>
    </div>
  );
};
