import type { FC } from "defuss";
import { createRef, createStore } from "defuss";
import { Combobox, ComboboxOption } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ComboboxScreen: FC = () => {
  const selectedValueRef = createRef<HTMLSpanElement>();
  const multiSelectRef = createRef<HTMLDivElement>();
  const disabledRef = createRef<HTMLSpanElement>();
  const invalidRef = createRef<HTMLSpanElement>();
  const selectedValuesStore = createStore<string[]>([]);

  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Combobox</h1>
      <p class="text-lg text-muted-foreground">
        Autocomplete input with suggestions.
      </p>

      <h2
        id="example-frameworks"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2"
      >
        Frameworks
      </h2>
      <CodePreview
        code={`<Combobox className="w-[200px]" placeholder="Select framework" searchPlaceholder="Search framework..." onValueChange={setValue}>
    <ComboboxOption value="Next.js" />
    <ComboboxOption value="SvelteKit" />
    <ComboboxOption value="Nuxt.js" />
    <ComboboxOption value="Remix" />
    <ComboboxOption value="Astro" />
</Combobox>`}
        language="tsx"
      >
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
          <p class="text-sm text-muted-foreground">
            Selected:{" "}
            <span ref={selectedValueRef} class="text-foreground">
              None
            </span>
          </p>
        </div>
      </CodePreview>

      <h2
        id="example-multiple-selection"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Multiple Selection (aria-multiselectable)
      </h2>
      <CodePreview
        code={`const selectedValues = createStore<string[]>([]);

<Combobox
    className="w-[200px]"
    placeholder="Select frameworks"
    searchPlaceholder="Search frameworks..."
    onValueChange={(value) => {
        const current = selectedValues.get();
        if (current.includes(value)) {
            selectedValues.set(current.filter(v => v !== value));
        } else {
            selectedValues.set([...current, value]);
        }
    }}
>
    <ComboboxOption value="Next.js" />
    <ComboboxOption value="SvelteKit" />
    <ComboboxOption value="Nuxt.js" />
    <ComboboxOption value="Remix" />
    <ComboboxOption value="Astro" />
</Combobox>
<div class="flex flex-wrap gap-1 mt-2" ref={multiSelectRef}>
    {selectedValues.get().map((value) => (
        <span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-muted-foreground/10 bg-muted">
            {value}
        </span>
    ))}
</div>
<div class="text-sm text-muted-foreground">
    Selected: <span ref={selectedValueRef}>None</span>
</div>`}
        language="tsx"
      >
        <div class="space-y-3">
          <div class="w-[200px]">
            <Combobox
              className="w-[200px]"
              placeholder="Select frameworks"
              searchPlaceholder="Search frameworks..."
              onValueChange={(value) => {
                const current = selectedValuesStore.get();
                let newSelected: string[];
                if (current.includes(value)) {
                  newSelected = current.filter((v) => v !== value);
                } else {
                  newSelected = [...current, value];
                }
                selectedValuesStore.set(newSelected);

                if (multiSelectRef.current) {
                  multiSelectRef.current.innerHTML = "";
                  newSelected.forEach((val) => {
                    const pill = document.createElement("span");
                    pill.className =
                      "inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ring-muted-foreground/10 bg-muted";
                    pill.textContent = val;
                    multiSelectRef.current!.appendChild(pill);
                  });
                }

                if (selectedValueRef.current) {
                  selectedValueRef.current.textContent =
                    newSelected.length > 0 ? newSelected.join(", ") : "None";
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
          <div class="flex flex-wrap gap-1" ref={multiSelectRef}></div>
          <p class="text-sm text-muted-foreground">
            Multi-select can be implemented by managing selected values in your
            own state/store
          </p>
        </div>
      </CodePreview>

      <h2
        id="example-searchable-custom"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Searchable with Custom Search
      </h2>
      <CodePreview
        code={`<Combobox
    className="w-[200px]"
    placeholder="Select a country"
    searchPlaceholder="Type to search..."
    onValueChange={setValue}
>
      <ComboboxOption value="United States" data-keywords="usa america us" />
      <ComboboxOption value="Canada" data-keywords="ca" />
      <ComboboxOption value="Mexico" data-keywords="mx" />
      <ComboboxOption value="United Kingdom" data-keywords="uk britain" />
      <ComboboxOption value="Germany" data-keywords="de deutschland" />
</Combobox>`}
        language="tsx"
      >
        <div class="space-y-3">
          <div class="w-[200px]">
            <Combobox
              className="w-[200px]"
              placeholder="Select a country"
              searchPlaceholder="Type to search..."
              onValueChange={(value) => {
                if (selectedValueRef.current) {
                  selectedValueRef.current.textContent = value;
                }
              }}
            >
              <ComboboxOption value="United States" data-keywords="usa america us" />
              <ComboboxOption value="Canada" data-keywords="ca" />
              <ComboboxOption value="Mexico" data-keywords="mx" />
              <ComboboxOption value="United Kingdom" data-keywords="uk britain" />
              <ComboboxOption value="Germany" data-keywords="de deutschland" />
            </Combobox>
          </div>
        </div>
      </CodePreview>

      <h2
        id="example-disabled"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Disabled State
      </h2>
      <CodePreview
        code={`<Combobox
    className="w-[200px]"
    placeholder="Select framework"
    searchPlaceholder="Search framework..."
    disabled
>
    <ComboboxOption value="Next.js" />
    <ComboboxOption value="SvelteKit" />
    <ComboboxOption value="Nuxt.js" />
    <ComboboxOption value="Remix" />
    <ComboboxOption value="Astro" />
</Combobox>`}
        language="tsx"
      >
        <div class="space-y-3">
          <div class="w-[200px]">
            <Combobox
              className="w-[200px]"
              placeholder="Select framework"
              searchPlaceholder="Search framework..."
              disabled
            >
              <ComboboxOption value="Next.js" />
              <ComboboxOption value="SvelteKit" />
              <ComboboxOption value="Nuxt.js" />
              <ComboboxOption value="Remix" />
              <ComboboxOption value="Astro" />
            </Combobox>
          </div>
          <p class="text-sm text-muted-foreground">
            Disabled combobox cannot be interacted with
          </p>
        </div>
      </CodePreview>

      <h2
        id="example-invalid"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Invalid State with Error Message
      </h2>
      <CodePreview
        code={`<div class="space-y-2">
    <Combobox
        className="w-[200px]"
        placeholder="Select framework"
        searchPlaceholder="Search framework..."
    >
        <ComboboxOption value="Next.js" />
        <ComboboxOption value="SvelteKit" />
        <ComboboxOption value="Nuxt.js" />
        <ComboboxOption value="Remix" />
        <ComboboxOption value="Astro" />
    </Combobox>
    <p class="text-sm text-destructive">Please select a valid framework</p>
</div>`}
        language="tsx"
      >
        <div class="space-y-2">
          <div class="w-[200px]">
            <Combobox
              className="w-[200px]"
              placeholder="Select framework"
              searchPlaceholder="Search framework..."
            >
              <ComboboxOption value="Next.js" />
              <ComboboxOption value="SvelteKit" />
              <ComboboxOption value="Nuxt.js" />
              <ComboboxOption value="Remix" />
              <ComboboxOption value="Astro" />
            </Combobox>
          </div>
          <p class="text-sm text-destructive">
            Please select a valid framework
          </p>
        </div>
      </CodePreview>

      <h2
        id="example-with-icons"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        With Icons in Options
      </h2>
      <CodePreview
        code={`<Combobox className="w-[200px]" placeholder="Select framework" searchPlaceholder="Search framework..." onValueChange={setValue}>
    <ComboboxOption value="Next.js">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/>
        </svg>
        Next.js
    </ComboboxOption>
    <ComboboxOption value="SvelteKit">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        SvelteKit
    </ComboboxOption>
    <ComboboxOption value="Nuxt.js">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 19H5.5L12 5.5z"/>
        </svg>
        Nuxt.js
    </ComboboxOption>
    <ComboboxOption value="Remix">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4z"/>
        </svg>
        Remix
    </ComboboxOption>
    <ComboboxOption value="Astro">
        <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 19H5.5L12 5.5z"/>
        </svg>
        Astro
    </ComboboxOption>
</Combobox>`}
        language="tsx"
      >
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
              <ComboboxOption value="Next.js">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z" />
                </svg>
                Next.js
              </ComboboxOption>
              <ComboboxOption value="SvelteKit">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                </svg>
                SvelteKit
              </ComboboxOption>
              <ComboboxOption value="Nuxt.js">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 19H5.5L12 5.5z" />
                </svg>
                Nuxt.js
              </ComboboxOption>
              <ComboboxOption value="Remix">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V8h2v4z" />
                </svg>
                Remix
              </ComboboxOption>
              <ComboboxOption value="Astro">
                <svg
                  class="w-4 h-4 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L2 22h20L12 2zm0 3.5L18.5 19H5.5L12 5.5z" />
                </svg>
                Astro
              </ComboboxOption>
            </Combobox>
          </div>
          <p class="text-sm text-muted-foreground">
            Icons can be added inside ComboboxOption
          </p>
        </div>
      </CodePreview>

      <h2
        id="example-grouped-options"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Grouped Options
      </h2>
      <CodePreview
        code={`<Combobox className="w-[200px]" placeholder="Select timezone" searchPlaceholder="Search timezone..." onValueChange={setValue}>
      <div data-force class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Americas</div>
      <ComboboxOption value="America/New_York">
        (GMT-5) New York
    </ComboboxOption>
      <ComboboxOption value="America/Los_Angeles">
        (GMT-8) Los Angeles
    </ComboboxOption>
      <ComboboxOption value="America/Chicago">
        (GMT-6) Chicago
    </ComboboxOption>
      <div data-force class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Europe</div>
      <ComboboxOption value="Europe/London">
        (GMT+0) London
    </ComboboxOption>
      <ComboboxOption value="Europe/Paris">
        (GMT+1) Paris
    </ComboboxOption>
      <ComboboxOption value="Europe/Berlin">
        (GMT+1) Berlin
    </ComboboxOption>
      <div data-force class="px-2 py-1.5 text-xs font-medium text-muted-foreground">Asia/Pacific</div>
      <ComboboxOption value="Asia/Tokyo">
        (GMT+9) Tokyo
    </ComboboxOption>
      <ComboboxOption value="Asia/Shanghai">
        (GMT+8) Shanghai
    </ComboboxOption>
</Combobox>`}
        language="tsx"
      >
        <div class="space-y-3">
          <div class="w-[200px]">
            <Combobox
              className="w-[200px]"
              placeholder="Select timezone"
              searchPlaceholder="Search timezone..."
              onValueChange={(value) => {
                if (selectedValueRef.current) {
                  selectedValueRef.current.textContent = value;
                }
              }}
            >
              <div data-force class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Americas
              </div>
              <ComboboxOption value="America/New_York">
                (GMT-5) New York
              </ComboboxOption>
              <ComboboxOption value="America/Los_Angeles">
                (GMT-8) Los Angeles
              </ComboboxOption>
              <ComboboxOption value="America/Chicago">
                (GMT-6) Chicago
              </ComboboxOption>
              <div data-force class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Europe
              </div>
              <ComboboxOption value="Europe/London">
                (GMT+0) London
              </ComboboxOption>
              <ComboboxOption value="Europe/Paris">
                (GMT+1) Paris
              </ComboboxOption>
              <ComboboxOption value="Europe/Berlin">
                (GMT+1) Berlin
              </ComboboxOption>
              <div data-force class="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Asia/Pacific
              </div>
              <ComboboxOption value="Asia/Tokyo">
                (GMT+9) Tokyo
              </ComboboxOption>
              <ComboboxOption value="Asia/Shanghai">
                (GMT+8) Shanghai
              </ComboboxOption>
            </Combobox>
          </div>
        </div>
      </CodePreview>

      <h2
        id="example-readonly-trigger"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Disabled Trigger
      </h2>
      <CodePreview
        code={`<Combobox
    className="w-[200px]"
    placeholder="Select framework"
    searchPlaceholder="Search framework..."
    disabled
    onValueChange={setValue}
>
    <ComboboxOption value="Next.js" />
    <ComboboxOption value="SvelteKit" />
    <ComboboxOption value="Nuxt.js" />
    <ComboboxOption value="Remix" />
    <ComboboxOption value="Astro" />
</Combobox>`}
        language="tsx"
      >
        <div class="space-y-3">
          <div class="w-[200px]">
            <Combobox
              className="w-[200px]"
              placeholder="Select framework"
              searchPlaceholder="Search framework..."
              disabled
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
          <p class="text-sm text-muted-foreground">
            Set <code class="text-foreground font-mono">disabled</code> to
            prevent interaction
          </p>
        </div>
      </CodePreview>
    </div>
  );
};
