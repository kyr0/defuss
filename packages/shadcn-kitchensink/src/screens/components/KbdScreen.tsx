import type { FC } from "defuss";
import { Kbd, KbdGroup } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const KbdScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Kbd</h1>
            <p class="text-lg text-muted-foreground">Displays keyboard key hints.</p>
            <CodePreview code={`<KbdGroup>
  <Kbd>⌘</Kbd>
  <Kbd>K</Kbd>
</KbdGroup>`} language="tsx">
                <KbdGroup>
                    <Kbd>⌘</Kbd>
                    <Kbd>K</Kbd>
                </KbdGroup>
            </CodePreview>
        </div>
    );
};
