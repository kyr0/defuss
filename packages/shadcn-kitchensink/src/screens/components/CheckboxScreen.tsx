import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const CheckboxScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Checkbox</h1>
            <p class="text-lg text-muted-foreground">A control that allows selecting multiple options.</p>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 pb-2 mt-8">Standard Checkbox</h2>
            <CodePreview code={`<div className="flex items-start gap-3">
  <input type="checkbox" id="checkbox-with-text" className="input" />
  <div className="grid gap-2">
    <label htmlFor="checkbox-with-text" className="label">Accept terms and conditions</label>
    <p className="text-muted-foreground text-sm">By clicking this checkbox, you agree to the terms and conditions.</p>
  </div>
</div>`} language="tsx">
                <div class="flex items-start gap-3">
                    <input type="checkbox" id="checkbox-with-text" class="input" />
                    <div class="grid gap-2">
                        <label for="checkbox-with-text" class="label">Accept terms and conditions</label>
                        <p class="text-muted-foreground text-sm">By clicking this checkbox, you agree to the terms and conditions.</p>
                    </div>
                </div>
            </CodePreview>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 pb-2 mt-8">Disabled Checkbox</h2>
            <CodePreview code={`<label className="label gap-3">
  <input type="checkbox" className="input" disabled />
  Accept terms and conditions
</label>`} language="tsx">
                <label class="label gap-3">
                    <input type="checkbox" class="input" disabled />
                    Accept terms and conditions
                </label>
            </CodePreview>

            <CodePreview code={`<form className="form flex flex-row items-start gap-3 rounded-md border p-4 shadow-xs">
  <input type="checkbox" id="checkbox-form-1" />
  <div className="flex flex-col gap-1">
    <label htmlFor="checkbox-form-1" className="leading-snug">Use different settings for my mobile devices</label>
    <p className="text-muted-foreground text-sm leading-snug">You can manage your mobile notifications in the mobile settings page.</p>
  </div>
</form>`} language="tsx">
                <form class="form flex flex-row items-start gap-3 rounded-md border p-4 shadow-xs">
                    <input type="checkbox" id="checkbox-form-1" />
                    <div class="flex flex-col gap-1">
                        <label for="checkbox-form-1" class="leading-snug">Use different settings for my mobile devices</label>
                        <p class="text-muted-foreground text-sm leading-snug">You can manage your mobile notifications in the mobile settings page.</p>
                    </div>
                </form>
            </CodePreview>

            <CodePreview code={`<form className="form flex flex-col gap-4">
  <header>
    <label htmlFor="demo-form-checkboxes" className="text-base leading-normal">Sidebar</label>
    <p className="text-muted-foreground text-sm">Select the items you want to display in the sidebar.</p>
  </header>
  <fieldset id="demo-form-checkboxes" className="flex flex-col gap-2">
    <label className="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="1" checked />Recents</label>
    <label className="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="2" checked />Home</label>
    <label className="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="3" />Applications</label>
    <label className="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="4" />Desktop</label>
    <label className="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="5" />Download</label>
    <label className="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="6" />Documents</label>
  </fieldset>
</form>`} language="tsx">
                <form class="form flex flex-col gap-4">
                    <header>
                        <label for="demo-form-checkboxes" class="text-base leading-normal">Sidebar</label>
                        <p class="text-muted-foreground text-sm">Select the items you want to display in the sidebar.</p>
                    </header>
                    <fieldset id="demo-form-checkboxes" class="flex flex-col gap-2">
                        <label class="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="1" checked />Recents</label>
                        <label class="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="2" checked />Home</label>
                        <label class="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="3" />Applications</label>
                        <label class="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="4" />Desktop</label>
                        <label class="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="5" />Download</label>
                        <label class="font-normal leading-tight"><input type="checkbox" name="demo-form-checkboxes" value="6" />Documents</label>
                    </fieldset>
                </form>
            </CodePreview>
        </div>
    );
};
