import type { FC } from "defuss";
import { RadioGroup, RadioGroupItem, Label } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const RadioGroupScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Radio Group</h1>
            <p class="text-lg text-muted-foreground">A set of checkable buttons where only one can be selected.</p>
            <CodePreview code={`<RadioGroup className="space-y-2" name="plan">
  <label className="flex items-center gap-2"><RadioGroupItem name="plan" value="starter" /> <span>Starter</span></label>
  <label className="flex items-center gap-2"><RadioGroupItem name="plan" value="pro" /> <span>Pro</span></label>
  <label className="flex items-center gap-2"><RadioGroupItem name="plan" value="enterprise" /> <span>Enterprise</span></label>
</RadioGroup>`} language="tsx">
                <RadioGroup className="space-y-2" name="plan">
                    <label class="flex items-center gap-2"><RadioGroupItem name="plan" value="starter" /> <Label>Starter</Label></label>
                    <label class="flex items-center gap-2"><RadioGroupItem name="plan" value="pro" /> <Label>Pro</Label></label>
                    <label class="flex items-center gap-2"><RadioGroupItem name="plan" value="enterprise" /> <Label>Enterprise</Label></label>
                </RadioGroup>
            </CodePreview>
        </div>
    );
};
