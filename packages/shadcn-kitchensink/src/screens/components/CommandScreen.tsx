import type { FC } from "defuss";
import {
    Command,
    CommandInput,
    CommandList,
    CommandItem,
    CommandSeparator,
        Kbd,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const CommandScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Command</h1>
            <p class="text-lg text-muted-foreground">Command menu with search and keyboard navigation.</p>

                        <h2 id="example-standalone" class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Standalone</h2>
                        <CodePreview code={`<Command className="w-full max-w-[450px] rounded-lg border shadow-md" aria-label="Command menu">
    <CommandInput placeholder="Type a command or search..." />
    <CommandList>
        <div role="group" aria-labelledby="cmd-suggestions">
            <span role="heading" id="cmd-suggestions">Suggestions</span>
            <CommandItem>
                <span>Calendar</span>
            </CommandItem>
            <CommandItem>
                <span>Search Emoji</span>
            </CommandItem>
            <CommandItem disabled>
                <span>Calculator</span>
            </CommandItem>
        </div>
        <CommandSeparator />
        <div role="group" aria-labelledby="cmd-settings">
            <span role="heading" id="cmd-settings">Settings</span>
            <CommandItem data-filter="Profile">
                <span>Profile</span>
                <Kbd className="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘P</Kbd>
            </CommandItem>
            <CommandItem data-filter="Billing">
                <span>Billing</span>
                <Kbd className="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘B</Kbd>
            </CommandItem>
            <CommandItem data-filter="Settings">
                <span>Settings</span>
                <Kbd className="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘S</Kbd>
            </CommandItem>
        </div>
    </CommandList>
</Command>`} language="tsx">
                                <Command className="w-full max-w-[450px] rounded-lg border shadow-md" aria-label="Command menu">
                                        <CommandInput placeholder="Type a command or search..." aria-controls="cmd-list" />
                                        <CommandList id="cmd-list">
                                                <div role="group" aria-labelledby="cmd-suggestions">
                                                        <span role="heading" id="cmd-suggestions">Suggestions</span>
                                                        <CommandItem>
                                                                <span>Calendar</span>
                                                        </CommandItem>
                                                        <CommandItem>
                                                                <span>Search Emoji</span>
                                                        </CommandItem>
                                                        <CommandItem disabled>
                                                                <span>Calculator</span>
                                                        </CommandItem>
                        </div>
                                                <CommandSeparator />
                        <div role="group" aria-labelledby="cmd-settings">
                                                        <span role="heading" id="cmd-settings">Settings</span>
                                                        <CommandItem data-filter="Profile">
                                                                <span>Profile</span>
                                                                <Kbd className="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘P</Kbd>
                                                        </CommandItem>
                                                        <CommandItem data-filter="Billing">
                                                                <span>Billing</span>
                                                                <Kbd className="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘B</Kbd>
                                                        </CommandItem>
                                                        <CommandItem data-filter="Settings">
                                                                <span>Settings</span>
                                                                <Kbd className="ml-auto text-muted-foreground bg-transparent tracking-widest">⌘S</Kbd>
                                                        </CommandItem>
                        </div>
                    </CommandList>
                </Command>
            </CodePreview>
        </div>
    );
};
