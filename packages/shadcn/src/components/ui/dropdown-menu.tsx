import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type DropdownMenuProps = ElementProps<HTMLDivElement>;
export type DropdownMenuTriggerProps = ElementProps<HTMLButtonElement>;
export type DropdownMenuContentProps = ElementProps<HTMLDivElement>;
export type DropdownMenuItemProps = ElementProps<HTMLDivElement> & {
    disabled?: boolean;
};
export type DropdownMenuSeparatorProps = ElementProps<HTMLDivElement>;
export type DropdownMenuLabelProps = ElementProps<HTMLDivElement>;

/**
 * Initialize dropdown menu behavior on mount - 1:1 port of Basecoat dropdown-menu.js
 */
const initDropdownMenu = (dropdownMenuComponent: HTMLDivElement) => {
    const trigger = dropdownMenuComponent.querySelector(':scope > button') as HTMLButtonElement;
    const popover = dropdownMenuComponent.querySelector(':scope > [data-popover]') as HTMLElement;
    const menu = popover?.querySelector('[role="menu"]') as HTMLElement;

    if (!trigger || !menu || !popover) {
        const missing: string[] = [];
        if (!trigger) missing.push('trigger');
        if (!menu) missing.push('menu');
        if (!popover) missing.push('popover');
        console.error(`Dropdown menu initialisation failed. Missing element(s): ${missing.join(', ')}`, dropdownMenuComponent);
        return;
    }

    const rootId = dropdownMenuComponent.id || `dropdown-menu-${Math.random().toString(36).slice(2, 9)}`;
    if (!dropdownMenuComponent.id) {
        dropdownMenuComponent.id = rootId;
    }
    if (!trigger.id) {
        trigger.id = `${rootId}-trigger`;
    }
    if (!popover.id) {
        popover.id = `${rootId}-popover`;
    }
    if (!menu.id) {
        menu.id = `${rootId}-menu`;
    }
    trigger.setAttribute("aria-controls", menu.id);
    menu.setAttribute("aria-labelledby", trigger.id);

    let menuItems: HTMLElement[] = [];
    let activeIndex = -1;

    const closePopover = (focusOnTrigger = true) => {
        if (trigger.getAttribute('aria-expanded') === 'false') return;
        trigger.setAttribute('aria-expanded', 'false');
        trigger.removeAttribute('aria-activedescendant');
        popover.setAttribute('aria-hidden', 'true');

        if (focusOnTrigger) {
            trigger.focus();
        }

        setActiveItem(-1);
    };

    const openPopover = (initialSelection: false | 'first' | 'last' = false) => {
        document.dispatchEvent(new CustomEvent('basecoat:popover', {
            detail: { source: dropdownMenuComponent }
        }));

        trigger.setAttribute('aria-expanded', 'true');
        popover.setAttribute('aria-hidden', 'false');
        menuItems = Array.from(menu.querySelectorAll('[role^="menuitem"]')).filter(item =>
            !item.hasAttribute('disabled') &&
            item.getAttribute('aria-disabled') !== 'true'
        ) as HTMLElement[];

        if (menuItems.length > 0 && initialSelection) {
            if (initialSelection === 'first') {
                setActiveItem(0);
            } else if (initialSelection === 'last') {
                setActiveItem(menuItems.length - 1);
            }
        }
    };

    const setActiveItem = (index: number) => {
        if (activeIndex > -1 && menuItems[activeIndex]) {
            menuItems[activeIndex].classList.remove('active');
        }
        activeIndex = index;
        if (activeIndex > -1 && menuItems[activeIndex]) {
            const activeItem = menuItems[activeIndex];
            activeItem.classList.add('active');
            trigger.setAttribute('aria-activedescendant', activeItem.id);
        } else {
            trigger.removeAttribute('aria-activedescendant');
        }
    };

    trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closePopover();
        } else {
            openPopover(false);
        }
    });

    dropdownMenuComponent.addEventListener('keydown', (event) => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';

        if (event.key === 'Escape') {
            if (isExpanded) closePopover();
            return;
        }

        if (!isExpanded) {
            if (['Enter', ' '].includes(event.key)) {
                event.preventDefault();
                openPopover(false);
            } else if (event.key === 'ArrowDown') {
                event.preventDefault();
                openPopover('first');
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                openPopover('last');
            }
            return;
        }

        if (menuItems.length === 0) return;

        let nextIndex = activeIndex;

        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                nextIndex = activeIndex === -1 ? 0 : Math.min(activeIndex + 1, menuItems.length - 1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                nextIndex = activeIndex === -1 ? menuItems.length - 1 : Math.max(activeIndex - 1, 0);
                break;
            case 'Home':
                event.preventDefault();
                nextIndex = 0;
                break;
            case 'End':
                event.preventDefault();
                nextIndex = menuItems.length - 1;
                break;
            case 'Enter':
            case ' ':
                event.preventDefault();
                menuItems[activeIndex]?.click();
                closePopover();
                return;
        }

        if (nextIndex !== activeIndex) {
            setActiveItem(nextIndex);
        }
    });

    menu.addEventListener('mousemove', (event) => {
        const menuItem = (event.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement;
        if (menuItem && menuItems.includes(menuItem)) {
            const index = menuItems.indexOf(menuItem);
            if (index !== activeIndex) {
                setActiveItem(index);
            }
        }
    });

    menu.addEventListener('mouseleave', () => {
        setActiveItem(-1);
    });

    menu.addEventListener('click', (event) => {
        const menuItem = (event.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
        if (!menuItem) return;

        const isDisabled = menuItem.hasAttribute('disabled') || menuItem.getAttribute('aria-disabled') === 'true';
        if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        closePopover();
    });

    document.addEventListener('click', (event) => {
        if (!dropdownMenuComponent.contains(event.target as Node)) {
            closePopover();
        }
    });

    document.addEventListener('basecoat:popover', ((event: CustomEvent) => {
        if (event.detail.source !== dropdownMenuComponent) {
            closePopover(false);
        }
    }) as EventListener);

    (dropdownMenuComponent as any).dataset.dropdownMenuInitialized = true;
    dropdownMenuComponent.dispatchEvent(new CustomEvent('basecoat:initialized'));
};

export const DropdownMenu: FC<DropdownMenuProps> = ({ className, children, ...props }) => {
    const dropdownRef = createRef<HTMLDivElement>();

    return (
        <div
            ref={dropdownRef}
            class={cn("dropdown-menu", className)}
            onMount={() => initDropdownMenu(dropdownRef.current!)}
            {...props}
        >
            {children}
        </div>
    );
};

export const DropdownMenuTrigger: FC<DropdownMenuTriggerProps> = ({ className, children, ...props }) => {
    return (
        <button
            {...props}
            type="button"
            aria-expanded="false"
            aria-haspopup="menu"
            class={cn(className)}
        >
            {children}
        </button>
    );
};

export const DropdownMenuContent: FC<DropdownMenuContentProps> = ({ id, className, children, ...props }) => {
    // Generate menu ID from popover ID if provided
    const menuId = id ? id.replace('-popover', '-menu') : undefined;
    const triggerId = id ? id.replace('-popover', '-trigger') : undefined;

    return (
        <div {...props} id={id} data-popover="" aria-hidden="true" class={cn(className)}>
            <div role="menu" id={menuId} aria-labelledby={triggerId} aria-orientation="vertical">
                {children}
            </div>
        </div>
    );
};

export const DropdownMenuItem: FC<DropdownMenuItemProps> = ({ className, disabled, children, role = "menuitem", ...props }) => {
    return (
        <div
            {...props}
            role={role}
            aria-disabled={disabled}
            data-disabled={disabled ? "true" : undefined}
            tabIndex={disabled ? -1 : 0}
            class={cn(className)}
        >
            {children}
        </div>
    );
};

export const DropdownMenuSeparator: FC<DropdownMenuSeparatorProps> = ({ className, ...props }) => {
    return <div role="separator" class={cn(className)} {...props} />;
};

export const DropdownMenuLabel: FC<DropdownMenuLabelProps> = ({ className, children, ...props }) => {
    return (
        <div class={cn(className)} {...props}>
            {children}
        </div>
    );
};
