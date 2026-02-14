import { createRef, type FC } from "defuss";
import { Button } from "defuss-shadcn";

export const Header: FC = () => {
    const themeSelectRef = createRef<HTMLSelectElement>();
    const doc = globalThis.document;

    const applyThemeVariant = (themeVariant: string) => {
        doc.documentElement.classList.forEach(c => {
            if (c.startsWith('theme-')) doc.documentElement.classList.remove(c);
        });

        if (themeVariant) {
            doc.documentElement.classList.add(`theme-${themeVariant}`);
            localStorage.setItem('themeVariant', themeVariant);
        } else {
            localStorage.removeItem('themeVariant');
        }
    };

    const onMount = () => {
        const themeSelect = themeSelectRef.current;
        if (!themeSelect) return;

        const storedTheme = localStorage.getItem('themeVariant');
        if (storedTheme) {
            themeSelect.value = storedTheme;
            applyThemeVariant(storedTheme);
        }

        themeSelect.addEventListener('change', () => {
            applyThemeVariant(themeSelect.value);
        });
    };

    const toggleSidebar = () => {
        document.dispatchEvent(new CustomEvent('basecoat:sidebar'));
    };

    const toggleTheme = () => {
        document.dispatchEvent(new CustomEvent('basecoat:theme'));
    };

    return (
        <header class="bg-background sticky inset-x-0 top-0 isolate flex shrink-0 items-center gap-2 border-b z-10" onMount={onMount}>
            <div class="flex h-14 w-full items-center gap-2 px-4">
                <Button
                    variant="ghost"
                    size="icon-sm"
                    className="mr-auto -ml-1.5"
                    onClick={toggleSidebar}
                    aria-label="Toggle sidebar"
                    data-tooltip="Toggle sidebar"
                    data-side="bottom"
                    data-align="start"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-panel-left"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
                </Button>

                <select
                    ref={themeSelectRef}
                    class="select h-8 leading-none"
                    id="theme-select"
                >
                    <option value="">Default</option>
                    <option value="claude">Claude</option>
                    <option value="doom-64">Doom 64</option>
                    <option value="supabase">Supabase</option>
                </select>

                <Button
                    variant="outline"
                    size="icon"
                    className="size-8"
                    onClick={toggleTheme}
                    aria-label="Toggle dark mode"
                    data-tooltip="Toggle dark mode"
                    data-side="bottom"
                >
                    <span class="hidden dark:block">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></svg>
                    </span>
                    <span class="block dark:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" /></svg>
                    </span>
                </Button>

                <a
                    href="https://github.com/hunvreus/basecoat"
                    class="btn-icon size-8"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-tooltip="GitHub repository"
                    data-side="bottom"
                    data-align="end"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-github"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                </a>
            </div>
        </header>
    );
};
