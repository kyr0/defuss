import type { FC } from "defuss";
import { Popover, PopoverTrigger, PopoverContent } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const PopoverScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Popover</h1>
            <p class="text-lg text-muted-foreground">Displays rich content in a portal, triggered by a button.</p>
                        <CodePreview code={`<Popover>
  <PopoverTrigger className="btn-outline">Open popover</PopoverTrigger>
    <PopoverContent className="w-80">
        <div className="grid gap-4">
            <header className="grid gap-1.5">
                <h4 className="leading-none font-medium">Dimensions</h4>
                <p className="text-muted-foreground text-sm">Set dimensions for the layer.</p>
            </header>
        </div>
  </PopoverContent>
</Popover>`} language="tsx">
                <Popover>
                    <PopoverTrigger className="btn-outline">Open popover</PopoverTrigger>
                                        <PopoverContent className="w-80">
                                                <div class="grid gap-4">
                                                        <header class="grid gap-1.5">
                                                                <h4 class="leading-none font-medium">Dimensions</h4>
                                                                <p class="text-muted-foreground text-sm">Set dimensions for the layer.</p>
                                                        </header>
                                                </div>
                    </PopoverContent>
                </Popover>
            </CodePreview>
        </div>
    );
};
