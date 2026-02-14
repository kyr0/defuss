import type { FC } from "defuss";
import { CodePreview } from "../../components/CodePreview.js";

export const TextareaScreen: FC = () => {
    return (
        <div class="space-y-6">
            <h1 class="text-3xl font-bold tracking-tight">Textarea</h1>
            <p class="text-lg text-muted-foreground">Displays a multi-line input field.</p>
                        <CodePreview code={`<div className="relative w-full max-w-2xl">
    <textarea className="textarea pt-15 pb-17 min-h-77" placeholder="console.log('Hello, world!')."></textarea>
    <header className="absolute top-0 flex items-center w-full gap-2 p-3 border-b">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-4 text-muted-foreground"><path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5z"></path><path d="M7.5 8h3v8l-2 -1"></path><path d="M16.5 8h-2.5a.5 .5 0 0 0 -.5 .5v3a.5 .5 0 0 0 .5 .5h1.423a.5 .5 0 0 1 .495 .57l-.418 2.93l-2 .5"></path></svg>
        <span className="font-mono text-sm text-muted-foreground mr-auto">script.js</span>
        <button className="btn-sm-icon-ghost text-muted-foreground hover:text-accent-foreground size-6" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
        </button>
        <button className="btn-sm-icon-ghost text-muted-foreground hover:text-accent-foreground size-6" type="button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
        </button>
    </header>
    <footer className="absolute bottom-0 flex items-center w-full gap-2 p-3 border-t">
        <span className="text-sm text-muted-foreground mr-auto">Line 1, Column 1</span>
        <button type="button" className="btn-sm">
            Run
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
        </button>
    </footer>
</div>`} language="tsx">
                                <div class="relative w-full max-w-2xl">
                                        <textarea class="textarea pt-15 pb-17 min-h-77" placeholder="console.log('Hello, world!')."></textarea>
                                        <header class="absolute top-0 flex items-center w-full gap-2 p-3 border-b">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4 text-muted-foreground"><path d="M20 4l-2 14.5l-6 2l-6 -2l-2 -14.5z"></path><path d="M7.5 8h3v8l-2 -1"></path><path d="M16.5 8h-2.5a.5 .5 0 0 0 -.5 .5v3a.5 .5 0 0 0 .5 .5h1.423a.5 .5 0 0 1 .495 .57l-.418 2.93l-2 .5"></path></svg>
                                                <span class="font-mono text-sm text-muted-foreground mr-auto">script.js</span>
                                                <button class="btn-sm-icon-ghost text-muted-foreground hover:text-accent-foreground size-6" type="button">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" /><path d="M16 16h5v5" /></svg>
                                                </button>
                                                <button class="btn-sm-icon-ghost text-muted-foreground hover:text-accent-foreground size-6" type="button">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                                </button>
                                        </header>
                                        <footer class="absolute bottom-0 flex items-center w-full gap-2 p-3 border-t">
                                                <span class="text-sm text-muted-foreground mr-auto">Line 1, Column 1</span>
                                                <button type="button" class="btn-sm">
                                                        Run
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
                                                </button>
                                        </footer>
                                </div>
            </CodePreview>
        </div>
    );
};
