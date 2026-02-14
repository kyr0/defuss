import type { FC } from "defuss";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuItem,
    Kbd,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const DropdownMenuScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Dropdown Menu</h1>
            <p class="text-lg text-muted-foreground">Displays a menu to the user.</p>

            <CodePreview code={`<DropdownMenu>
  <DropdownMenuTrigger className="btn-outline">Open</DropdownMenuTrigger>
    <DropdownMenuContent id="demo-dropdown-menu-popover" className="min-w-56">
        <div role="menu" id="demo-dropdown-menu-menu" aria-labelledby="demo-dropdown-menu-trigger">
        <div role="group" aria-labelledby="account-options">
                    <div role="heading" id="account-options">My Account</div>
                    <DropdownMenuItem>
                        Profile
                        <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⇧⌘P</Kbd>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Billing
                        <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⌘B</Kbd>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        Settings
                        <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⌘S</Kbd>
                    </DropdownMenuItem>
        </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>GitHub</DropdownMenuItem>
            <DropdownMenuItem disabled>API</DropdownMenuItem>
        </div>
  </DropdownMenuContent>
</DropdownMenu>`} language="tsx">
                <DropdownMenu>
                                        <DropdownMenuTrigger id="demo-dropdown-menu-trigger" className="btn-outline">Open</DropdownMenuTrigger>
                                        <DropdownMenuContent id="demo-dropdown-menu-popover" className="min-w-56">
                                                <div role="group" aria-labelledby="account-options">
                                                        <div role="heading" id="account-options">My Account</div>
                                                        <DropdownMenuItem>
                                                                Profile
                                                                <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⇧⌘P</Kbd>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                                Billing
                                                                <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⌘B</Kbd>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem>
                                                                Settings
                                                                <Kbd className="text-muted-foreground ml-auto text-xs tracking-widest bg-transparent">⌘S</Kbd>
                                                        </DropdownMenuItem>
                                                </div>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem>GitHub</DropdownMenuItem>
                                                <DropdownMenuItem disabled>API</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CodePreview>
        </div>
    );
};
