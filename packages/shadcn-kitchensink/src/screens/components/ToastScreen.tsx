import type { FC } from "defuss";
import { Button, Toaster, toast } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ToastScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Toast</h1>
            <p class="text-lg text-muted-foreground">A concise message that appears temporarily.</p>
            <CodePreview code={`<>
  <Button onClick={() => toast({ category: "success", title: "Saved", description: "Your changes have been saved." })}>
    Show toast
  </Button>
  <Toaster className="toaster" />
</>`} language="tsx">
                <div class="space-y-2">
                    <Button
                        onClick={() => toast({
                            category: "success",
                            title: "Saved",
                            description: "Your changes have been saved.",
                        })}
                    >
                        Show toast
                    </Button>
                    <Toaster className="toaster" />
                </div>
            </CodePreview>
        </div>
    );
};
