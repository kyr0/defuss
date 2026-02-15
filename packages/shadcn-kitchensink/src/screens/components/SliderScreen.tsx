import type { FC } from "defuss";
import { Label, Slider } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SliderScreen: FC = () => {
  return (
    <div class="space-y-8">
      <h1 class="text-3xl font-bold tracking-tight">Slider</h1>
      <p class="text-lg text-muted-foreground">
        An input where the user selects a value from a range.
      </p>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Basic Slider</h2>
        <CodePreview
          code={`<Slider min={0} max={100} step={1} value={40} className="w-full max-w-sm" />`}
          language="tsx"
        >
          <Slider
            min={0}
            max={100}
            step={1}
            value={40}
            className="w-full max-w-sm"
          />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Range Slider</h2>
        <p class="text-sm text-muted-foreground">
          Two knobs for selecting a min/max range.
        </p>
        <CodePreview
          code={`<Slider min={0} max={100} step={1} value={[20, 80]} className="w-full max-w-sm" />`}
          language="tsx"
        >
          <Slider
            min={0}
            max={100}
            step={1}
            value={[20, 80]}
            className="w-full max-w-sm"
          />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Disabled Slider</h2>
        <p class="text-sm text-muted-foreground">Non-interactive slider.</p>
        <CodePreview
          code={`<Slider min={0} max={100} step={1} value={50} disabled className="w-full max-w-sm" />`}
          language="tsx"
        >
          <Slider
            min={0}
            max={100}
            step={1}
            value={50}
            disabled
            className="w-full max-w-sm"
          />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Slider with Step Values</h2>
        <p class="text-sm text-muted-foreground">
          Different step intervals (step={5}).
        </p>
        <CodePreview
          code={`<Slider min={0} max={100} step={5} value={25} className="w-full max-w-sm" />`}
          language="tsx"
        >
          <Slider
            min={0}
            max={100}
            step={5}
            value={25}
            className="w-full max-w-sm"
          />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Slider with Custom Values</h2>
        <p class="text-sm text-muted-foreground">
          Different min/max values (min={10}, max={50}).
        </p>
        <CodePreview
          code={`<Slider min={10} max={50} step={1} value={30} className="w-full max-w-sm" />`}
          language="tsx"
        >
          <Slider
            min={10}
            max={50}
            step={1}
            value={30}
            className="w-full max-w-sm"
          />
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Slider with Value Display</h2>
        <p class="text-sm text-muted-foreground">
          Value displayed above thumb using defaultValue.
        </p>
        <CodePreview
          code={`<div class="flex flex-col items-center gap-2">
  <Slider min={0} max={100} step={1} defaultValue={[30]} className="w-full max-w-sm" />
  <span class="text-sm font-medium">30</span>
</div>`}
          language="tsx"
        >
          <div class="flex flex-col items-center gap-2">
            <Slider
              min={0}
              max={100}
              step={1}
              defaultValue={[30]}
              className="w-full max-w-sm"
            />
            <span class="text-sm font-medium">30</span>
          </div>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Inline Slider</h2>
        <p class="text-sm text-muted-foreground">
          Inline with label using flex layout.
        </p>
        <CodePreview
          code={`<div class="flex items-center gap-4">
  <Label for="inline-slider">Volume</Label>
  <Slider min={0} max={100} step={1} defaultValue={[50]} id="inline-slider" className="w-32" />
</div>`}
          language="tsx"
        >
          <div class="flex items-center gap-4">
            <Label for="inline-slider">Volume</Label>
            <Slider
              min={0}
              max={100}
              step={1}
              defaultValue={[50]}
              id="inline-slider"
              className="w-32"
            />
          </div>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Horizontal Slider in Form</h2>
        <p class="text-sm text-muted-foreground">
          Slider within a form layout.
        </p>
        <CodePreview
          code={`<form class="space-y-4">
  <div class="space-y-2">
    <Label>Brightness</Label>
    <Slider min={0} max={100} step={1} defaultValue={[75]} className="w-full" />
  </div>
</form>`}
          language="tsx"
        >
          <form class="space-y-4">
            <div class="space-y-2">
              <Label>Brightness</Label>
              <Slider
                min={0}
                max={100}
                step={1}
                defaultValue={[75]}
                className="w-full"
              />
            </div>
          </form>
        </CodePreview>
      </div>

      <div class="space-y-4">
        <h2 class="text-xl font-semibold">Slider with Markers</h2>
        <p class="text-sm text-muted-foreground">
          Slider with visible markers/indications.
        </p>
        <CodePreview
          code={`<Slider min={0} max={100} step={20} defaultValue={[40]} className="w-full max-w-sm" />`}
          language="tsx"
        >
          <Slider
            min={0}
            max={100}
            step={20}
            defaultValue={[40]}
            className="w-full max-w-sm"
          />
        </CodePreview>
      </div>
    </div>
  );
};
