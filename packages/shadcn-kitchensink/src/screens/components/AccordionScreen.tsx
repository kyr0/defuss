import type { FC } from "defuss";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Avatar,
  AvatarFallback,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const AccordionScreen: FC = () => {
  return (
    <div class="space-y-6">
      <h1 class="text-3xl font-bold tracking-tight">Accordion</h1>
      <p class="text-lg text-muted-foreground">
        A vertically stacked set of interactive headings that each reveal a
        section of content.
      </p>

      <h2
        id="example-default"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Default
      </h2>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<Accordion className="w-full max-w-md">
   <AccordionItem>
     <AccordionTrigger>
       <span className="flex flex-1 items-start justify-between gap-4 py-4 text-left text-sm font-medium hover:underline">
         Is it accessible?
         <svg xmlns="http://www.w3.org/2000/svg" className="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
       </span>
     </AccordionTrigger>
     <AccordionContent className="pb-4">
       <p className="text-sm">Yes. It adheres to the WAI-ARIA design pattern.</p>
     </AccordionContent>
   </AccordionItem>
 </Accordion>`}
        language="tsx"
      >
        <Accordion className="w-full max-w-md">
          <AccordionItem>
            <AccordionTrigger>
              <span class="flex flex-1 items-start justify-between gap-4 py-4 pr-2 text-left text-sm font-medium hover:underline">
                Is it accessible?
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p class="text-sm">
                Yes. It adheres to the WAI-ARIA design pattern.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem>
            <AccordionTrigger>
              <span class="flex flex-1 items-start justify-between gap-4 py-4 pr-2 text-left text-sm font-medium hover:underline">
                Is it styled?
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p class="text-sm">
                Yes. It comes with default styles that matches the other
                components&apos; aesthetic.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem>
            <AccordionTrigger>
              <span class="flex flex-1 items-start justify-between gap-4 py-4 pr-2 text-left text-sm font-medium hover:underline">
                Is it animated?
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p class="text-sm whitespace-pre-wrap">
                Yes. It&apos;s animated by default, but you can disable it if
                you prefer.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CodePreview>

      <h2
        id="example-accordion-in-card"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Accordion in Card
      </h2>
      <p class="text-lg text-muted-foreground mb-4">
        Accordion embedded within a Card component with card header.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-xl"
        code={`<Card className="w-full max-w-xl">
   <CardHeader>
     <CardTitle>FAQ</CardTitle>
   </CardHeader>
   <CardContent>
     <Accordion type="single" collapsible className="w-full">
       <AccordionItem value="item-1">
         <AccordionTrigger>Is it accessible?</AccordionTrigger>
         <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
       </AccordionItem>
       <AccordionItem value="item-2">
         <AccordionTrigger>Is it styled?</AccordionTrigger>
         <AccordionContent>Yes. It comes with default styles that matches the other components' aesthetic.</AccordionContent>
       </AccordionItem>
       <AccordionItem value="item-3">
         <AccordionTrigger>Is it animated?</AccordionTrigger>
         <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
       </AccordionItem>
     </Accordion>
   </CardContent>
 </Card>`}
        language="tsx"
      >
        <Card className="w-full max-w-xl">
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that matches the other
                  components' aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It's animated by default, but you can disable it if you
                  prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </CodePreview>

      <h2
        id="example-accordion-with-icons"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Accordion with Icons
      </h2>
      <p class="text-lg text-muted-foreground mb-4">
        Accordion items with custom icons like chevrons, arrows, or other SVG
        icons.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<Accordion type="single" collapsible className="w-full">
   <AccordionItem value="item-1">
     <AccordionTrigger className="group">
       <span className="flex items-center gap-3">
         <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
         <span>Is it accessible?</span>
       </span>
     </AccordionTrigger>
     <AccordionContent className="pb-4">
       <p className="text-sm">Yes. It adheres to the WAI-ARIA design pattern.</p>
     </AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-2">
     <AccordionTrigger className="group">
       <span className="flex items-center gap-3">
         <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1" /></svg>
         <span>Is it styled?</span>
       </span>
     </AccordionTrigger>
     <AccordionContent className="pb-4">
       <p className="text-sm">Yes. It comes with default styles that matches the other components' aesthetic.</p>
     </AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-3">
     <AccordionTrigger className="group">
       <span className="flex items-center gap-3">
         <svg xmlns="http://www.w3.org/2000/svg" className="size-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
         <span>Is it animated?</span>
       </span>
     </AccordionTrigger>
     <AccordionContent>
       <p class="text-sm whitespace-pre-wrap">Yes. It's animated by default, but you can disable it if you prefer.</p>
     </AccordionContent>
   </AccordionItem>
 </Accordion>`}
        language="tsx"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="group">
              <span class="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
                <span>Is it accessible?</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p class="text-sm">
                Yes. It adheres to the WAI-ARIA design pattern.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="group">
              <span class="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <rect width="7" height="7" x="3" y="3" rx="1" />
                </svg>
                <span>Is it styled?</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p class="text-sm">
                Yes. It comes with default styles that matches the other
                components' aesthetic.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="group">
              <span class="flex items-center gap-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  class="size-5 text-primary"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>Is it animated?</span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <p class="text-sm whitespace-pre-wrap">
                Yes. It's animated by default, but you can disable it if you
                prefer.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CodePreview>

      <h2
        id="example-accordion-with-custom-trigger"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Accordion with Custom Trigger Content
      </h2>
      <p class="text-lg text-muted-foreground mb-4">
        Accordion with custom trigger content including avatars, names, and
        titles.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<Accordion type="single" collapsible className="w-full">
   <AccordionItem value="item-1">
     <AccordionTrigger className="flex items-center gap-3 group">
       <Avatar className="h-9 w-9">
         <Avatar src="https://github.com/shadcn.png" />
         <AvatarFallback>CN</AvatarFallback>
       </Avatar>
       <div className="flex flex-col items-start text-left">
         <span className="text-sm font-medium">shadcn</span>
         <span className="text-xs text-muted-foreground">Updated 2 hours ago</span>
       </div>
     </AccordionTrigger>
     <AccordionContent className="pb-4">
       <p className="text-sm">This is the first item's accordion content.</p>
     </AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-2">
     <AccordionTrigger className="flex items-center gap-3 group">
       <Avatar className="h-9 w-9">
         <Avatar src="https://github.com/mitchellhamann.png" />
         <AvatarFallback>MH</AvatarFallback>
       </Avatar>
       <div className="flex flex-col items-start text-left">
         <span className="text-sm font-medium">Mitchell Hamann</span>
         <span className="text-xs text-muted-foreground">Updated 5 hours ago</span>
       </div>
     </AccordionTrigger>
     <AccordionContent className="pb-4">
       <p className="text-sm">This is the second item's accordion content.</p>
     </AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-3">
     <AccordionTrigger className="flex items-center gap-3 group">
       <Avatar className="h-9 w-9">
         <Avatar src="https://github.com/hunvreus.png" />
         <AvatarFallback>RH</AvatarFallback>
       </Avatar>
       <div className="flex flex-col items-start text-left">
         <span className="text-sm font-medium">Ronan Berder</span>
         <span className="text-xs text-muted-foreground">Updated 1 day ago</span>
       </div>
     </AccordionTrigger>
     <AccordionContent>
       <p class="text-sm">This is the third item's accordion content.</p>
     </AccordionContent>
   </AccordionItem>
 </Accordion>`}
        language="tsx"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger className="flex items-center gap-3 group">
              <Avatar className="h-9 w-9">
                <Avatar className="rounded-lg" src="https://github.com/kyr0.png" alt="@kyr0" />
                <AvatarFallback>KY</AvatarFallback>
              </Avatar>
              <div class="flex flex-col items-start text-left">
                <span class="text-sm font-medium">kyr0</span>
                <span class="text-xs text-muted-foreground">
                  Updated 2 hours ago
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p class="text-sm">This is the first item's accordion content.</p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger className="flex items-center gap-3 group">
              <Avatar className="h-9 w-9">
                <Avatar src="https://github.com/mitchellhamann.png" />
                <AvatarFallback>MH</AvatarFallback>
              </Avatar>
              <div class="flex flex-col items-start text-left">
                <span class="text-sm font-medium">Mitchell Hamann</span>
                <span class="text-xs text-muted-foreground">
                  Updated 5 hours ago
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <p class="text-sm">
                This is the second item's accordion content.
              </p>
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger className="flex items-center gap-3 group">
              <Avatar className="h-9 w-9">
                <Avatar src="https://github.com/hunvreus.png" />
                <AvatarFallback>RH</AvatarFallback>
              </Avatar>
              <div class="flex flex-col items-start text-left">
                <span class="text-sm font-medium">Ronan Berder</span>
                <span class="text-xs text-muted-foreground">
                  Updated 1 day ago
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <p class="text-sm">This is the third item's accordion content.</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CodePreview>

      <h2
        id="example-multiple-expanded-items"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Accordion with Multiple Expanded Items
      </h2>
      <p class="text-lg text-muted-foreground mb-4">
        Accordion that allows multiple items to be expanded simultaneously.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<Accordion type="multiple" className="w-full">
   <AccordionItem value="item-1">
     <AccordionTrigger>Is it accessible?</AccordionTrigger>
     <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-2">
     <AccordionTrigger>Is it styled?</AccordionTrigger>
     <AccordionContent>Yes. It comes with default styles that matches the other components' aesthetic.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-3">
     <AccordionTrigger>Is it animated?</AccordionTrigger>
     <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
   </AccordionItem>
</Accordion>`}
        language="tsx"
      >
        <Accordion type="multiple" className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2">
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that matches the other
              components' aesthetic.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It's animated by default, but you can disable it if you
              prefer.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CodePreview>

      <h2
        id="example-disabled-accordion-items"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Accordion with Disabled Items
      </h2>
      <p class="text-lg text-muted-foreground mb-4">
        Accordion with disabled items that cannot be interacted with.
      </p>
      <CodePreview
        previewClassName="items-start justify-start"
        className="w-full max-w-md"
        code={`<Accordion type="single" collapsible className="w-full">
   <AccordionItem value="item-1">
     <AccordionTrigger>Is it accessible?</AccordionTrigger>
     <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-2" disabled>
     <AccordionTrigger>Is it styled?</AccordionTrigger>
     <AccordionContent>Yes. It comes with default styles that matches the other components' aesthetic.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-3">
     <AccordionTrigger>Is it animated?</AccordionTrigger>
     <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
   </AccordionItem>
</Accordion>`}
        language="tsx"
      >
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1">
            <AccordionTrigger>Is it accessible?</AccordionTrigger>
            <AccordionContent>
              Yes. It adheres to the WAI-ARIA design pattern.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-2" disabled>
            <AccordionTrigger>Is it styled?</AccordionTrigger>
            <AccordionContent>
              Yes. It comes with default styles that matches the other
              components' aesthetic.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="item-3">
            <AccordionTrigger>Is it animated?</AccordionTrigger>
            <AccordionContent>
              Yes. It's animated by default, but you can disable it if you
              prefer.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CodePreview>

      <h2
        id="example-collapsibleVsAlwaysExpanded"
        class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2 mt-8"
      >
        Accordion with Different Collapse Behavior
      </h2>
      <p class="text-lg text-muted-foreground mb-4">
        Comparing collapsible (allows closing all) vs non-collapsible (always
        one expanded) modes.
      </p>
      <div class="grid gap-6 md:grid-cols-2 mt-4">
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">Collapsible (can close all)</h3>
          <CodePreview
            previewClassName="items-start justify-start"
            className="w-full"
            code={`<Accordion type="single" collapsible className="w-full">
   <AccordionItem value="item-1">
     <AccordionTrigger>Is it accessible?</AccordionTrigger>
     <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-2">
     <AccordionTrigger>Is it styled?</AccordionTrigger>
     <AccordionContent>Yes. It comes with default styles that matches the other components' aesthetic.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-3">
     <AccordionTrigger>Is it animated?</AccordionTrigger>
     <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
   </AccordionItem>
</Accordion>`}
            language="tsx"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that matches the other
                  components' aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It's animated by default, but you can disable it if you
                  prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CodePreview>
        </div>
        <div class="space-y-4">
          <h3 class="text-lg font-semibold">
            Always one expanded
          </h3>
          <CodePreview
            previewClassName="items-start justify-start"
            className="w-full"
            code={`<Accordion type="single" className="w-full">
   <AccordionItem value="item-1">
     <AccordionTrigger>Is it accessible?</AccordionTrigger>
     <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-2">
     <AccordionTrigger>Is it styled?</AccordionTrigger>
     <AccordionContent>Yes. It comes with default styles that matches the other components' aesthetic.</AccordionContent>
   </AccordionItem>
   <AccordionItem value="item-3">
     <AccordionTrigger>Is it animated?</AccordionTrigger>
     <AccordionContent>Yes. It's animated by default, but you can disable it if you prefer.</AccordionContent>
   </AccordionItem>
</Accordion>`}
            language="tsx"
          >
            <Accordion type="single" className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>Is it accessible?</AccordionTrigger>
                <AccordionContent>
                  Yes. It adheres to the WAI-ARIA design pattern.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is it styled?</AccordionTrigger>
                <AccordionContent>
                  Yes. It comes with default styles that matches the other
                  components' aesthetic.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Is it animated?</AccordionTrigger>
                <AccordionContent>
                  Yes. It's animated by default, but you can disable it if you
                  prefer.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CodePreview>
        </div>
      </div>
    </div>
  );
};
