import type { FC } from "defuss";
import { Button, Item, ItemContent, ItemDescription, ItemTitle, Spinner } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const SpinnerScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Spinner</h1>
            <p class="text-lg text-muted-foreground">Shows a loading indicator.</p>

                        <h2 id="example-default" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Default</h2>
                        <CodePreview code={`<article className="group/item flex items-center border text-sm rounded-md transition-colors flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border-transparent bg-muted/50 p-4 gap-4">
    <div className="flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:size-4">
        <Spinner />
    </div>
    <div className="flex flex-1 flex-col gap-1">
        <h3 className="flex w-fit items-center gap-2 text-sm leading-snug font-medium line-clamp-1">Processing payment...</h3>
    </div>
    <div className="flex flex-col gap-1 flex-none text-center">
        <p className="text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance">$100.00</p>
    </div>
</article>`} language="tsx">
                                <article class="group/item flex items-center border text-sm rounded-md transition-colors flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border-transparent bg-muted/50 p-4 gap-4 w-full max-w-xs">
                                        <div class="flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:size-4">
                                                <Spinner />
                                        </div>
                                        <div class="flex flex-1 flex-col gap-1">
                                                <h3 class="flex w-fit items-center gap-2 text-sm leading-snug font-medium line-clamp-1">Processing payment...</h3>
                                        </div>
                                        <div class="flex flex-col gap-1 flex-none text-center">
                                                <p class="text-muted-foreground line-clamp-2 text-sm leading-normal font-normal text-balance">$100.00</p>
                                        </div>
                                </article>
                        </CodePreview>

                        <h2 id="example-button" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">In button</h2>
                        <CodePreview code={`<Button size="sm" disabled>
    <Spinner className="size-4" />
    Loading...
</Button>`} language="tsx">
                                <Button size="sm" disabled>
                                        <Spinner className="size-4" />
                                        Loading...
                                </Button>
                        </CodePreview>

                        <h2 id="example-item" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">With Item</h2>
                        <CodePreview code={`<Item className="w-full max-w-md" variant="outline">
    <div className="flex shrink-0 items-center justify-center gap-2 self-start [&_svg]:pointer-events-none size-8 border rounded-md bg-muted [&_svg:not([class*='size-'])]:size-4">
        <Spinner className="size-4 text-muted-foreground" />
    </div>
    <ItemContent>
        <ItemTitle>Downloading...</ItemTitle>
        <ItemDescription>129 MB / 1000 MB</ItemDescription>
    </ItemContent>
    <Button size="sm" variant="outline" className="self-start">Cancel</Button>
</Item>`} language="tsx">
                                <Item className="w-full max-w-md" variant="outline">
                                        <div class="flex shrink-0 items-center justify-center gap-2 self-start [&_svg]:pointer-events-none size-8 border rounded-md bg-muted [&_svg:not([class*='size-'])]:size-4">
                                                <Spinner className="size-4 text-muted-foreground" />
                                        </div>
                                        <ItemContent>
                                                <ItemTitle>Downloading...</ItemTitle>
                                                <ItemDescription>129 MB / 1000 MB</ItemDescription>
                                        </ItemContent>
                                        <Button size="sm" variant="outline" className="self-start">Cancel</Button>
                                </Item>
            </CodePreview>
        </div>
    );
};
