import type { FC } from "defuss";
import { Skeleton } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SkeletonScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Skeleton</h1>
            <p class="text-lg text-muted-foreground">Used to show placeholders while content is loading.</p>
            <CodePreview code={`<div className="flex items-center gap-4">
  <Skeleton className="size-10 rounded-full" />
  <div className="grid gap-2">
    <Skeleton className="h-4 w-[150px]" />
    <Skeleton className="h-4 w-[100px]" />
  </div>
</div>`} language="tsx">
                <div class="flex items-center gap-4">
                    <Skeleton className="size-10 rounded-full" />
                    <div class="grid gap-2">
                        <Skeleton className="h-4 w-[150px]" />
                        <Skeleton className="h-4 w-[100px]" />
                    </div>
                </div>
            </CodePreview>

            <CodePreview code={`<div className="card w-full @md:w-auto @md:min-w-sm">
  <header>
    <div className="bg-accent animate-pulse rounded-md h-4 w-2/3"></div>
    <div className="bg-accent animate-pulse rounded-md h-4 w-1/2"></div>
  </header>
  <section>
    <div className="bg-accent animate-pulse rounded-md aspect-square w-full"></div>
  </section>
</div>`} language="tsx">
                <div class="card w-full @md:w-auto @md:min-w-sm">
                    <header>
                        <div class="bg-accent animate-pulse rounded-md h-4 w-2/3"></div>
                        <div class="bg-accent animate-pulse rounded-md h-4 w-1/2"></div>
                    </header>
                    <section>
                        <div class="bg-accent animate-pulse rounded-md aspect-square w-full"></div>
                    </section>
                </div>
            </CodePreview>
        </div>
    );
};
