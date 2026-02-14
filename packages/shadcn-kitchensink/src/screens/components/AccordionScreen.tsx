import type { FC } from "defuss";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const AccordionScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Accordion</h1>
            <p class="text-lg text-muted-foreground">A vertically stacked set of interactive headings that each reveal a section of content.</p>

            <h2 id="example-default" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Default</h2>
            <CodePreview previewClassName="items-start justify-start" className="w-full max-w-md" code={`<Accordion className="w-full max-w-md">
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
</Accordion>`} language="tsx">
                <Accordion className="w-full max-w-md">
                    <AccordionItem>
                        <AccordionTrigger>
                            <span class="flex flex-1 items-start justify-between gap-4 py-4 pr-2 text-left text-sm font-medium hover:underline">
                                Is it accessible?
                                <svg xmlns="http://www.w3.org/2000/svg" class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4"><p class="text-sm">Yes. It adheres to the WAI-ARIA design pattern.</p></AccordionContent>
                    </AccordionItem>
                    <AccordionItem>
                        <AccordionTrigger>
                            <span class="flex flex-1 items-start justify-between gap-4 py-4 pr-2 text-left text-sm font-medium hover:underline">
                                Is it styled?
                                <svg xmlns="http://www.w3.org/2000/svg" class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4"><p class="text-sm">Yes. It comes with default styles that matches the other components&apos; aesthetic.</p></AccordionContent>
                    </AccordionItem>
                    <AccordionItem>
                        <AccordionTrigger>
                            <span class="flex flex-1 items-start justify-between gap-4 py-4 pr-2 text-left text-sm font-medium hover:underline">
                                Is it animated?
                                <svg xmlns="http://www.w3.org/2000/svg" class="text-muted-foreground pointer-events-none size-4 shrink-0 translate-y-0.5 transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="m6 9 6 6 6-6" />
                                </svg>
                            </span>
                        </AccordionTrigger>
                        <AccordionContent><p class="text-sm whitespace-pre-wrap">Yes. It&apos;s animated by default, but you can disable it if you prefer.</p></AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CodePreview>
        </div>
    );
};
