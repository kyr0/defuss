import { createRef, type FC } from "defuss";
import { Progress } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ProgressScreen: FC = () => {
    const indicatorRef = createRef<HTMLDivElement>();

    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Progress</h1>
            <p class="text-lg text-muted-foreground">Displays an indicator showing task completion progress.</p>

            <h2 id="usage" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Usage</h2>
                        <CodePreview previewClassName="items-start justify-start" className="w-full max-w-sm" code={`<div className="bg-primary/20 relative h-2 w-full overflow-hidden rounded-full">
  <div id="demo-progress" className="bg-primary h-full w-full flex-1 transition-all" style="width: 17%"></div>
</div>

setTimeout(() => {
  document.getElementById("demo-progress")!.style.width = "66%";
}, 500);`} language="tsx">
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
                    <div ref={indicatorRef} class="bg-primary h-full w-full flex-1 transition-all" style="width: 17%" />
                </div>
            </CodePreview>

            <h2 id="example-component" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">With Progress component</h2>
            <CodePreview previewClassName="items-start justify-start" className="w-full max-w-sm" code={`<Progress value={66} className="w-full" />`} language="tsx">
                <Progress value={66} className="w-full" />
            </CodePreview>
        </div>
    );
};
