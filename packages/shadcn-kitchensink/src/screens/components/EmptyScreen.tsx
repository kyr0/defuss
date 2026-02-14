import type { FC } from "defuss";
import { Button } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const EmptyScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Empty</h1>
            <p class="text-lg text-muted-foreground">A presentational empty state for first-time and no-data views.</p>

            <CodePreview className="w-full" previewClassName="items-start justify-start" code={`<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
  <header className="flex max-w-sm flex-col items-center gap-2 text-center">
    <div className="mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 10.5 8 13l2 2.5" /><path d="m14 10.5 2 2.5-2 2.5" /><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" /></svg>
    </div>
    <h3 className="text-lg font-medium tracking-tight">No Projects Yet</h3>
    <p className="text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4">
      You haven't created any projects yet. Get started by creating your first project.
    </p>
  </header>
  <section className="flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance">
    <div className="flex gap-2">
      <Button>Create Project</Button>
      <Button variant="outline">Import Project</Button>
    </div>
  </section>
  <a href="#" className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] underline-offset-4 hover:underline h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground">
    Learn More
  </a>
</div>`} language="tsx">
                <div class="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed p-6 text-center text-balance md:p-12 text-neutral-800 dark:text-neutral-300">
                    <header class="flex max-w-sm flex-col items-center gap-2 text-center">
                        <div class="mb-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-muted text-foreground flex size-10 shrink-0 items-center justify-center rounded-lg [&_svg:not([class*='size-'])]:size-6">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10.5 8 13l2 2.5" /><path d="m14 10.5 2 2.5-2 2.5" /><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2z" /></svg>
                        </div>
                        <h3 class="text-lg font-medium tracking-tight">No Projects Yet</h3>
                        <p class="text-muted-foreground [&>a:hover]:text-primary text-sm/relaxed [&>a]:underline [&>a]:underline-offset-4">
                            You haven&apos;t created any projects yet. Get started by creating your first project.
                        </p>
                    </header>
                    <section class="flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance">
                        <div class="flex gap-2">
                            <Button>Create Project</Button>
                            <Button variant="outline">Import Project</Button>
                        </div>
                    </section>
                    <a href="#" class="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] underline-offset-4 hover:underline h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 text-muted-foreground">
                        Learn More
                    </a>
                </div>
            </CodePreview>
        </div>
    );
};
