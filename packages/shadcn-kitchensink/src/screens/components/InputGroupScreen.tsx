import type { FC } from "defuss";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "defuss-shadcn";
import { CodePreview } from "../../components/CodePreview.js";

export const InputGroupScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Input Group</h1>
            <p class="text-lg text-muted-foreground">Compose inputs with icons, text, buttons, tooltips and dropdowns.</p>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Default</h2>
            <CodePreview code={`<div className="grid gap-6">
  <div className="relative">
    <input type="text" className="input pl-9 pr-20" placeholder="Search..." />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
    </div>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">12 results</div>
  </div>

  <div className="relative">
    <input type="text" className="input pl-15 pr-9" placeholder="example.com" />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">https://</div>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
    </div>
  </div>

  <div className="relative">
    <textarea className="textarea pr-10 min-h-27 pb-12" placeholder="Ask, Search or Chat..."></textarea>
    <footer role="group" className="absolute bottom-0 px-3 pb-3 pt-1.5 flex items-center w-full gap-2">
      <button type="button" className="btn-icon-outline rounded-full size-6 text-muted-foreground hover:text-accent-foreground">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger className="btn-sm-ghost text-muted-foreground hover:text-accent-foreground h-6 p-2">Auto</DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-32" data-side="top">
          <DropdownMenuItem>Auto</DropdownMenuItem>
          <DropdownMenuItem>Agent</DropdownMenuItem>
          <DropdownMenuItem>Manual</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <div className="text-muted-foreground text-sm ml-auto">52% used</div>
      <hr className="w-0 h-4 border-r border-border shrink-0 m-0" />
      <button type="button" className="btn-icon rounded-full size-6 bg-muted-foreground hover:bg-foreground" disabled>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
      </button>
    </footer>
  </div>

  <div className="relative">
    <input type="text" className="input pr-9" placeholder="@shadcn" />
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full [&>svg]:size-3">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    </div>
  </div>
</div>`} language="tsx">
                <div class="grid gap-6 w-full max-w-2xl">
                    <div class="relative">
                        <input type="text" class="input pl-9 pr-20" placeholder="Search..." />
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">12 results</div>
                    </div>

                    <div class="relative">
                        <input type="text" class="input pl-15 pr-9" placeholder="example.com" />
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">https://</div>
                        <div data-tooltip="This is content in a tooltip." class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4 cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                        </div>
                    </div>

                    <div class="relative">
                        <textarea class="textarea pr-10 min-h-27 pb-12" placeholder="Ask, Search or Chat..."></textarea>
                        <footer role="group" class="absolute bottom-0 px-3 pb-3 pt-1.5 flex items-center w-full gap-2">
                            <button type="button" class="btn-icon-outline rounded-full size-6 text-muted-foreground hover:text-accent-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                            </button>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="btn-sm-ghost text-muted-foreground hover:text-accent-foreground h-6 p-2">Auto</DropdownMenuTrigger>
                                <DropdownMenuContent className="min-w-32" data-side="top">
                                    <DropdownMenuItem>Auto</DropdownMenuItem>
                                    <DropdownMenuItem>Agent</DropdownMenuItem>
                                    <DropdownMenuItem>Manual</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <div class="text-muted-foreground text-sm ml-auto">52% used</div>
                            <hr class="w-0 h-4 border-r border-border shrink-0 m-0" />
                            <button type="button" class="btn-icon rounded-full size-6 bg-muted-foreground hover:bg-foreground" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
                            </button>
                        </footer>
                    </div>

                    <div class="relative">
                        <input type="text" class="input pr-9" placeholder="@shadcn" />
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none bg-primary text-primary-foreground flex size-4 items-center justify-center rounded-full [&>svg]:size-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        </div>
                    </div>
                </div>
            </CodePreview>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Icons</h2>
            <CodePreview code={`<div className="grid gap-6">
  <div className="relative">
    <input type="text" className="input pl-9" placeholder="Search..." />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">...</div>
  </div>

  <div className="relative">
    <input type="text" className="input px-9" placeholder="Card number" />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">...</div>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">...</div>
  </div>
</div>`} language="tsx">
                <div class="grid gap-6 w-full max-w-2xl">
                    <div class="relative">
                        <input type="text" class="input pl-9" placeholder="Search..." />
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                        </div>
                    </div>
                    <div class="relative">
                        <input type="text" class="input px-9" placeholder="Card number" />
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></svg>
                        </div>
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground [&>svg]:size-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        </div>
                    </div>
                </div>
            </CodePreview>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Text</h2>
            <CodePreview code={`<div className="grid gap-6">
  <div className="relative">
    <input type="text" className="input pl-7 pr-12" placeholder="0.00" />
    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">$</div>
    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">USD</div>
  </div>

  <div className="relative">
    <textarea className="textarea pr-10 min-h-25 pb-12" placeholder="Enter your message"></textarea>
    <footer role="group" className="absolute bottom-0 px-3 pb-3 pt-1.5 flex items-center w-full gap-2">
      <div className="text-muted-foreground text-sm">120 characters left</div>
    </footer>
  </div>
</div>`} language="tsx">
                <div class="grid gap-6 w-full max-w-2xl">
                    <div class="relative">
                        <input type="text" class="input pl-7 pr-12" placeholder="0.00" />
                        <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">$</div>
                        <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground text-sm">USD</div>
                    </div>
                    <div class="relative">
                        <textarea class="textarea pr-10 min-h-25 pb-12" placeholder="Enter your message"></textarea>
                        <footer role="group" class="absolute bottom-0 px-3 pb-3 pt-1.5 flex items-center w-full gap-2">
                            <div class="text-muted-foreground text-sm">120 characters left</div>
                        </footer>
                    </div>
                </div>
            </CodePreview>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Buttons and dropdown</h2>
            <CodePreview code={`<div className="grid gap-6">
  <div className="relative">
    <input type="text" readOnly className="input pr-9" value="https://x.com/hunvreus" />
    <button type="button" className="group absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6">...</button>
  </div>

  <div className="relative">
    <input type="text" className="input pr-30" placeholder="Enter search query" />
    <DropdownMenu className="absolute right-1.5 top-1/2 -translate-y-1/2">
      <DropdownMenuTrigger className="btn-sm-ghost text-muted-foreground hover:text-accent-foreground p-2 h-6">Search in...</DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-32" data-align="end">
        <DropdownMenuItem>Documentation</DropdownMenuItem>
        <DropdownMenuItem>Blog Posts</DropdownMenuItem>
        <DropdownMenuItem>Changelog</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>`} language="tsx">
                <div class="grid gap-6 w-full max-w-2xl">
                    <div class="relative">
                        <input type="text" readonly class="input pr-9" value="https://x.com/hunvreus" />
                        <button
                            data-copied="false"
                            onClick={(e) => {
                                const button = e.currentTarget as HTMLButtonElement;
                                button.dataset.copied = "true";
                                setTimeout(() => {
                                    button.dataset.copied = "false";
                                }, 2000);
                            }}
                            class="group absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-data-[copied=true]:hidden"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="hidden group-data-[copied=true]:block"><path d="M20 6 9 17l-5-5" /></svg>
                        </button>
                    </div>

                    <div class="relative">
                        <input type="text" class="input pr-30" placeholder="Enter search query" />
                        <DropdownMenu className="absolute right-1.5 top-1/2 -translate-y-1/2">
                            <DropdownMenuTrigger className="btn-sm-ghost text-muted-foreground hover:text-accent-foreground p-2 h-6">
                                Search in...
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-3"><path d="m6 9 6 6 6-6" /></svg>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="min-w-32" data-align="end">
                                <DropdownMenuItem>Documentation</DropdownMenuItem>
                                <DropdownMenuItem>Blog Posts</DropdownMenuItem>
                                <DropdownMenuItem>Changelog</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CodePreview>

            <h2 class="text-2xl font-semibold tracking-tight scroll-m-20 border-b pb-2">Tooltip</h2>
            <CodePreview code={`<div className="grid gap-6">
  <div className="relative">
    <input type="password" className="input pr-9" placeholder="Enter password" />
    <div data-tooltip="Password must be at least 8 characters long." data-side="top" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4 cursor-help">...</div>
  </div>
</div>`} language="tsx">
                <div class="grid gap-6 w-full max-w-2xl">
                    <div class="relative">
                        <input type="password" class="input pr-9" placeholder="Enter password" />
                        <div data-tooltip="Password must be at least 8 characters long." data-side="top" class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4 cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                        </div>
                    </div>

                    <div class="relative">
                        <input type="email" class="input pl-9" placeholder="Your email address" />
                        <div data-tooltip="Click for help with API keys." data-side="left" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground [&>svg]:size-4 cursor-help">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></svg>
                        </div>
                    </div>

                    <div class="relative">
                        <input type="text" class="input pl-21 pr-9 rounded-full" placeholder="Search secure origin" />
                        <button type="button" class="absolute right-1.5 top-1/2 -translate-y-1/2 btn-icon-ghost text-muted-foreground hover:text-accent-foreground size-6 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></svg>
                        </button>
                        <div class="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                            <Popover>
                                <PopoverTrigger className="btn-sm-icon-ghost rounded-full size-6">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>
                                </PopoverTrigger>
                                <PopoverContent className="max-w-72">
                                    <h3 class="font-medium mb-1">Your connection is not secure.</h3>
                                    <p>You should not enter any sensitive information on this site.</p>
                                </PopoverContent>
                            </Popover>
                            <div class="text-muted-foreground text-sm pointer-events-none">https://</div>
                        </div>
                    </div>
                </div>
            </CodePreview>
        </div>
    );
};
