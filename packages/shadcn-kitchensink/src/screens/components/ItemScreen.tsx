import type { FC } from "defuss";
import { Button, Item, ItemContent, ItemDescription, ItemLeading, ItemTitle, ItemTrailing } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ItemScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Item</h1>
            <p class="text-lg text-muted-foreground">A versatile content row for lists, cards, and navigation.</p>

            <h2 id="example-basic" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Basic</h2>
            <CodePreview code={`<div className="flex flex-col gap-6">
  <Item variant="outline" className="w-full max-w-md">
    <ItemContent>
      <ItemTitle>Basic Item</ItemTitle>
      <ItemDescription>A simple item with title and description.</ItemDescription>
    </ItemContent>
    <Button size="sm" variant="outline">Action</Button>
  </Item>

  <a href="#" className="group/item flex items-center border text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border-border py-3 px-4 gap-2.5">
    <div className="flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none bg-transparent [&_svg]:size-5">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></svg>
    </div>
    <div className="flex flex-1 flex-col gap-1">
      <h3 className="flex w-fit items-center gap-2 text-sm leading-snug font-medium">Your profile has been verified.</h3>
    </div>
    <div className="flex items-center gap-2 [&_svg]:size-4">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
    </div>
  </a>
</div>`} language="tsx">
                <div class="flex flex-col gap-6">
                    <Item variant="outline" className="w-full max-w-md">
                        <ItemContent>
                            <ItemTitle>Basic Item</ItemTitle>
                            <ItemDescription>A simple item with title and description.</ItemDescription>
                        </ItemContent>
                        <Button size="sm" variant="outline">Action</Button>
                    </Item>

                    <a href="#" class="group/item flex items-center border text-sm rounded-md transition-colors [a]:hover:bg-accent/50 [a]:transition-colors duration-100 flex-wrap outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] border-border py-3 px-4 gap-2.5 w-full max-w-md">
                        <div class="flex shrink-0 items-center justify-center gap-2 [&_svg]:pointer-events-none bg-transparent [&_svg]:size-5">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></svg>
                        </div>
                        <div class="flex flex-1 flex-col gap-1">
                            <h3 class="flex w-fit items-center gap-2 text-sm leading-snug font-medium">Your profile has been verified.</h3>
                        </div>
                        <div class="flex items-center gap-2 [&_svg]:size-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                        </div>
                    </a>
                </div>
            </CodePreview>

            <h2 id="example-composed" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Composed API</h2>
            <CodePreview code={`<Item className="w-full max-w-md" variant="muted">
  <ItemLeading className="[&_svg]:size-5">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 12 2 2 4-4" /><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9" /></svg>
  </ItemLeading>
  <ItemContent>
    <ItemTitle>Deployment completed</ItemTitle>
    <ItemDescription>Your app is now live and ready to share.</ItemDescription>
  </ItemContent>
  <ItemTrailing>
    <Button size="sm" variant="outline">View</Button>
  </ItemTrailing>
</Item>`} language="tsx">
                <Item className="w-full max-w-md" variant="muted">
                    <ItemLeading className="[&_svg]:size-5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 12 2 2 4-4" /><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9" /></svg>
                    </ItemLeading>
                    <ItemContent>
                        <ItemTitle>Deployment completed</ItemTitle>
                        <ItemDescription>Your app is now live and ready to share.</ItemDescription>
                    </ItemContent>
                    <ItemTrailing>
                        <Button size="sm" variant="outline">View</Button>
                    </ItemTrailing>
                </Item>
            </CodePreview>
        </div>
    );
};
