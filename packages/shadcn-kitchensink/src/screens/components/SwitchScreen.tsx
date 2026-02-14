import type { FC } from "defuss";
import { Switch, Label } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SwitchScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Switch</h1>
            <p class="text-lg text-muted-foreground">A control to toggle between two states.</p>
            <CodePreview code={`<div className="flex items-center gap-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">Airplane Mode</Label>
</div>`} language="tsx">
                <div class="flex items-center gap-2">
                    <Switch id="airplane-mode" />
                    <Label for="airplane-mode">Airplane Mode</Label>
                </div>
            </CodePreview>
        </div>
    );
};
