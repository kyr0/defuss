import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type CommandProps = ElementProps<HTMLDivElement>;
export type CommandInputProps = ElementProps<HTMLInputElement> & {
    placeholder?: string;
};
export type CommandListProps = ElementProps<HTMLDivElement>;
export type CommandGroupProps = ElementProps<HTMLDivElement> & {
    heading?: string;
};
export type CommandItemProps = ElementProps<HTMLDivElement> & {
    keywords?: string;
    disabled?: boolean;
};
export type CommandEmptyProps = ElementProps<HTMLDivElement>;
export type CommandSeparatorProps = ElementProps<HTMLDivElement>;

/**
 * Initialize command behavior on mount - 1:1 port of Basecoat command.js
 */
const initCommand = (container: HTMLDivElement) => {
    const input = container.querySelector('header input') as HTMLInputElement;
    const menu = container.querySelector('[role="menu"]') as HTMLElement;

    if (!input || !menu) {
        const missing: string[] = [];
        if (!input) missing.push('input');
        if (!menu) missing.push('menu');
        console.error(`Command component initialization failed. Missing element(s): ${missing.join(', ')}`, container);
        return;
    }

    const allMenuItems = Array.from(menu.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
    const menuItems = allMenuItems.filter(item =>
        !item.hasAttribute('disabled') &&
        item.getAttribute('aria-disabled') !== 'true'
    );
    let visibleMenuItems = [...menuItems];
    let activeIndex = -1;

    const setActiveItem = (index: number) => {
        if (activeIndex > -1 && menuItems[activeIndex]) {
            menuItems[activeIndex].classList.remove('active');
        }

        activeIndex = index;

        if (activeIndex > -1) {
            const activeItem = menuItems[activeIndex];
            activeItem.classList.add('active');
            if (activeItem.id) {
                input.setAttribute('aria-activedescendant', activeItem.id);
            } else {
                input.removeAttribute('aria-activedescendant');
            }
        } else {
            input.removeAttribute('aria-activedescendant');
        }
    };

    const filterMenuItems = () => {
        const searchTerm = input.value.trim().toLowerCase();

        setActiveItem(-1);

        visibleMenuItems = [];
        allMenuItems.forEach(item => {
            if (item.hasAttribute('data-force')) {
                item.setAttribute('aria-hidden', 'false');
                if (menuItems.includes(item)) {
                    visibleMenuItems.push(item);
                }
                return;
            }

            const itemText = ((item as any).dataset.filter || item.textContent || '').trim().toLowerCase();
            const keywordList = ((item as any).dataset.keywords || '')
                .toLowerCase()
                .split(/[\s,]+/)
                .filter(Boolean);
            const matchesKeyword = keywordList.some((keyword: string) => keyword.includes(searchTerm));
            const matches = itemText.includes(searchTerm) || matchesKeyword;
            item.setAttribute('aria-hidden', String(!matches));
            if (matches && menuItems.includes(item)) {
                visibleMenuItems.push(item);
            }
        });

        if (visibleMenuItems.length > 0) {
            setActiveItem(menuItems.indexOf(visibleMenuItems[0]));
            visibleMenuItems[0].scrollIntoView({ block: 'nearest' });
        }
    };

    input.addEventListener('input', filterMenuItems);

    const handleKeyNavigation = (event: KeyboardEvent) => {
        if (!['ArrowDown', 'ArrowUp', 'Enter', 'Home', 'End'].includes(event.key)) {
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            if (activeIndex > -1) {
                menuItems[activeIndex]?.click();
            }
            return;
        }

        if (visibleMenuItems.length === 0) return;

        event.preventDefault();

        const currentVisibleIndex = activeIndex > -1 ? visibleMenuItems.indexOf(menuItems[activeIndex]) : -1;
        let nextVisibleIndex = currentVisibleIndex;

        switch (event.key) {
            case 'ArrowDown':
                if (currentVisibleIndex < visibleMenuItems.length - 1) {
                    nextVisibleIndex = currentVisibleIndex + 1;
                }
                break;
            case 'ArrowUp':
                if (currentVisibleIndex > 0) {
                    nextVisibleIndex = currentVisibleIndex - 1;
                } else if (currentVisibleIndex === -1) {
                    nextVisibleIndex = 0;
                }
                break;
            case 'Home':
                nextVisibleIndex = 0;
                break;
            case 'End':
                nextVisibleIndex = visibleMenuItems.length - 1;
                break;
        }

        if (nextVisibleIndex !== currentVisibleIndex) {
            const newActiveItem = visibleMenuItems[nextVisibleIndex];
            setActiveItem(menuItems.indexOf(newActiveItem));
            newActiveItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    };

    menu.addEventListener('mousemove', (event) => {
        const menuItem = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement;
        if (menuItem && visibleMenuItems.includes(menuItem)) {
            const index = menuItems.indexOf(menuItem);
            if (index !== activeIndex) {
                setActiveItem(index);
            }
        }
    });

    menu.addEventListener('click', (event) => {
        const clickedItem = (event.target as HTMLElement).closest('[role="menuitem"]') as HTMLElement;
        if (clickedItem && visibleMenuItems.includes(clickedItem)) {
            const dialog = container.closest('dialog.command-dialog') as HTMLDialogElement;
            if (dialog && !clickedItem.hasAttribute('data-keep-command-open')) {
                dialog.close();
            }
        }
    });

    input.addEventListener('keydown', handleKeyNavigation);

    if (visibleMenuItems.length > 0) {
        setActiveItem(menuItems.indexOf(visibleMenuItems[0]));
        visibleMenuItems[0].scrollIntoView({ block: 'nearest' });
    }

    (container as any).dataset.commandInitialized = true;
    container.dispatchEvent(new CustomEvent('basecoat:initialized'));
};

export const Command: FC<CommandProps> = ({ className, children, ...props }) => {
    const commandRef = createRef<HTMLDivElement>();

    return (
        <div
            ref={commandRef}
            class={cn("command", className)}
            onMount={() => initCommand(commandRef.current!)}
            {...props}
        >
            {children}
        </div>
    );
};

export const CommandInput: FC<CommandInputProps> = ({ className, placeholder, ...props }) => {
    return (
        <header>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
                type="text"
                placeholder={placeholder}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded="true"
                class={cn(className)}
                {...props}
            />
        </header>
    );
};

export const CommandList: FC<CommandListProps> = ({ className, children, ...props }) => {
    return (
        <div role="menu" class={cn("scrollbar", className)} {...props}>
            {children}
        </div>
    );
};

export const CommandGroup: FC<CommandGroupProps> = ({ className, heading, children, ...props }) => {
    return (
        <div role="group" class={cn(className)} {...props}>
            {heading && <div role="presentation">{heading}</div>}
            {children}
        </div>
    );
};

export const CommandItem: FC<CommandItemProps> = ({ className, keywords, disabled, children, ...props }) => {
    return (
        <div
            role="menuitem"
            data-keywords={keywords}
            aria-disabled={disabled}
            class={cn(className)}
            {...props}
        >
            {children}
        </div>
    );
};

export const CommandEmpty: FC<CommandEmptyProps> = ({ className, children, ...props }) => {
    return (
        <div class={cn(className)} {...props}>
            {children}
        </div>
    );
};

export const CommandSeparator: FC<CommandSeparatorProps> = ({ className, ...props }) => {
    return <div role="separator" class={cn(className)} {...props} />;
};
