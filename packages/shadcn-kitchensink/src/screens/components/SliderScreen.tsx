import type { FC } from "defuss";
import { Slider } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SliderScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Slider</h1>
            <p class="text-lg text-muted-foreground">An input where the user selects a value from a range.</p>
            <CodePreview code={`<Slider min={0} max={100} step={1} value={40} className="w-full max-w-sm" />`} language="tsx">
                <Slider min={0} max={100} step={1} value={40} className="w-full max-w-sm" />
            </CodePreview>
        </div>
    );
};
