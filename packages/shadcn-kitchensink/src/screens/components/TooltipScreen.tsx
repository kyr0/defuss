import type { FC } from "defuss";
import { Badge, Button, Tooltip } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const TooltipScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Tooltip</h1>
      <p class="text-lg text-muted-foreground">
        Displays informative text when users hover over, focus on, or tap an
        element.
      </p>
      <CodePreview
        code={`<Tooltip tooltip="Add to library" side="top">
   <Button variant="outline">Hover me</Button>
 </Tooltip>`}
        language="tsx"
      >
        <Tooltip tooltip="Add to library" side="top">
          <Button variant="outline">Hover me</Button>
        </Tooltip>
      </CodePreview>
      <CodePreview
        code={`<div class="flex flex-wrap items-center gap-4">
     <Tooltip tooltip="Left side" side="left">
         <Button variant="outline">Left</Button>
     </Tooltip>
     <Tooltip tooltip="Right side" side="right">
         <Button variant="outline">Right</Button>
     </Tooltip>
     <Tooltip tooltip="Bottom side" side="bottom">
         <Button variant="outline">Bottom</Button>
     </Tooltip>
 </div>`}
        language="tsx"
      >
        <div class="flex flex-wrap items-center gap-4">
          <Tooltip tooltip="Left side" side="left">
            <Button variant="outline">Left</Button>
          </Tooltip>
          <Tooltip tooltip="Right side" side="right">
            <Button variant="outline">Right</Button>
          </Tooltip>
          <Tooltip tooltip="Bottom side" side="bottom">
            <Button variant="outline">Bottom</Button>
          </Tooltip>
        </div>
      </CodePreview>
      <CodePreview
        code={`<div class="flex flex-wrap items-center gap-4">
     <Tooltip tooltip="Tooltip on icon" side="top">
         <button class="btn-icon btn-outline" type="button">
             <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <circle cx="12" cy="12" r="10" />
                 <line x1="12" y1="16" x2="12" y2="12" />
                 <line x1="12" y1="8" x2="12.01" y2="8" />
             </svg>
         </button>
     </Tooltip>
     <Tooltip tooltip="Tooltip on badge" side="top">
         <Badge>Hover me</Badge>
     </Tooltip>
     <Tooltip tooltip="Tooltip on link" side="top">
         <a href="#" class="btn-link">Link</a>
     </Tooltip>
 </div>`}
        language="tsx"
      >
        <div class="flex flex-wrap items-center gap-4">
          <Tooltip tooltip="Tooltip on icon" side="top">
            <button class="btn-icon btn-outline" type="button">
              <svg
                class="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </Tooltip>
          <Tooltip tooltip="Tooltip on badge" side="top">
            <Badge>Hover me</Badge>
          </Tooltip>
          <Tooltip tooltip="Tooltip on link" side="top">
            <a href="#" class="btn-link">
              Link
            </a>
          </Tooltip>
        </div>
      </CodePreview>
      <CodePreview
        code={`<div class="flex flex-wrap items-center gap-4">
     <Tooltip tooltip="Default delay" side="top">
         <Button variant="outline">Default</Button>
     </Tooltip>
     <Tooltip tooltip="Short delay" side="top" data-delay="100">
         <Button variant="outline">Short</Button>
     </Tooltip>
     <Tooltip tooltip="Long delay" side="top" data-delay="1000">
         <Button variant="outline">Long</Button>
     </Tooltip>
 </div>`}
        language="tsx"
      >
        <div class="flex flex-wrap items-center gap-4">
          <Tooltip tooltip="Default delay" side="top">
            <Button variant="outline">Default</Button>
          </Tooltip>
          <Tooltip tooltip="Short delay" side="top" data-delay="100">
            <Button variant="outline">Short</Button>
          </Tooltip>
          <Tooltip tooltip="Long delay" side="top" data-delay="1000">
            <Button variant="outline">Long</Button>
          </Tooltip>
        </div>
      </CodePreview>
    </div>
  );
};
