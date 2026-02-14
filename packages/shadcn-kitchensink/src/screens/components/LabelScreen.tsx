import type { FC } from "defuss";
import { Label, Input } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const LabelScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Label</h1>
            <p class="text-lg text-muted-foreground">Renders an accessible label.</p>
            <CodePreview code={`<div className="grid gap-2 w-full max-w-sm">
  <Label htmlFor="email">Email</Label>
  <Input id="email" type="email" placeholder="name@example.com" />
</div>`} language="tsx">
                <div class="grid gap-2 w-full max-w-sm">
                    <Label for="email">Email</Label>
                    <Input id="email" type="email" placeholder="name@example.com" />
                </div>
            </CodePreview>
        </div>
    );
};
