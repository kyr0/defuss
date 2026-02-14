import type { FC } from "defuss";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const ButtonGroupScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Button Group</h1>
            <p class="text-lg text-muted-foreground">Group related actions with shared borders and optional menus.</p>

            <CodePreview previewClassName="items-start justify-start" className="w-full" code={`<div className="flex w-fit items-stretch gap-2">
  <Button variant="outline" size="icon" aria-label="Go Back">...</Button>

  <div role="group" className="button-group">
    <Button variant="outline">Archive</Button>
    <Button variant="outline">Report</Button>
  </div>

  <div role="group" className="button-group">
    <Button variant="outline">Snooze</Button>
    <DropdownMenu id="demo-button-group-menu">
      <DropdownMenuTrigger id="demo-button-group-menu-trigger" className="btn-icon-outline">...</DropdownMenuTrigger>
      <DropdownMenuContent id="demo-button-group-menu-popover" data-align="end">
        <DropdownMenuItem>Mark as Read</DropdownMenuItem>
        <DropdownMenuItem>Archive</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Snooze</DropdownMenuItem>
        <DropdownMenuItem>Add to Calendar</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 [&_svg]:!text-destructive">Trash</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>`} language="tsx">
                <div class="flex w-fit items-stretch gap-2">
                    <Button variant="outline" size="icon" aria-label="Go Back">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m12 19-7-7 7-7" />
                            <path d="M19 12H5" />
                        </svg>
                    </Button>

                    <div role="group" class="button-group">
                        <Button variant="outline">Archive</Button>
                        <Button variant="outline">Report</Button>
                    </div>

                    <div role="group" class="button-group">
                        <Button variant="outline">Snooze</Button>

                        <DropdownMenu id="demo-button-group-menu">
                            <DropdownMenuTrigger id="demo-button-group-menu-trigger" className="btn-icon-outline" aria-label="More actions">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="19" cy="12" r="1" />
                                    <circle cx="5" cy="12" r="1" />
                                </svg>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent id="demo-button-group-menu-popover" data-align="end">
                                <DropdownMenuItem>Mark as Read</DropdownMenuItem>
                                <DropdownMenuItem>Archive</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>Snooze</DropdownMenuItem>
                                <DropdownMenuItem>Add to Calendar</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 [&_svg]:!text-destructive">Trash</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CodePreview>
        </div>
    );
};
