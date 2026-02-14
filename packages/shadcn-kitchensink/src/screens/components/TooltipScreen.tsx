import type { FC } from "defuss";
import { Tooltip, Button } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const TooltipScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Tooltip</h1>
            <p class="text-lg text-muted-foreground">Displays informative text when users hover over, focus on, or tap an element.</p>
            <CodePreview code={`<Tooltip tooltip="Add to library" side="top">
  <Button variant="outline">Hover me</Button>
</Tooltip>`} language="tsx">
                <Tooltip tooltip="Add to library" side="top">
                    <Button variant="outline">Hover me</Button>
                </Tooltip>
            </CodePreview>
        </div>
    );
};
