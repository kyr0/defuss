import type { FC } from "defuss";
import { createRef } from "defuss";
import { Combobox, ComboboxOption } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ComboboxScreen: FC = () => {
    const selectedValueRef = createRef<HTMLSpanElement>();

    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Combobox</h1>
            <p class="text-lg text-muted-foreground">Autocomplete input with suggestions.</p>

            <h2 id="example-frameworks" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Frameworks</h2>
            <CodePreview code={`<Combobox className="w-[200px]" placeholder="Select framework" searchPlaceholder="Search framework..." onValueChange={setValue}>
    <ComboboxOption value="Next.js" />
    <ComboboxOption value="SvelteKit" />
    <ComboboxOption value="Nuxt.js" />
    <ComboboxOption value="Remix" />
    <ComboboxOption value="Astro" />
</Combobox>`} language="tsx">
                <div class="space-y-3">
                    <div class="w-[200px]">
                        <Combobox
                            className="w-[200px]"
                            placeholder="Select framework"
                            searchPlaceholder="Search framework..."
                            onValueChange={(value) => {
                                if (selectedValueRef.current) {
                                    selectedValueRef.current.textContent = value;
                                }
                            }}
                        >
                        <ComboboxOption value="Next.js" />
                        <ComboboxOption value="SvelteKit" />
                        <ComboboxOption value="Nuxt.js" />
                        <ComboboxOption value="Remix" />
                        <ComboboxOption value="Astro" />
                        </Combobox>
                    </div>
                    <p class="text-sm text-muted-foreground">Selected: <span ref={selectedValueRef} class="text-foreground">None</span></p>
                </div>
            </CodePreview>
        </div>
    );
};
