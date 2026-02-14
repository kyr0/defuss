import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type PopoverProps = ElementProps<HTMLDivElement> & {
    id?: string;
};
export type PopoverTriggerProps = ElementProps<HTMLButtonElement>;
export type PopoverContentProps = ElementProps<HTMLDivElement>;

/**
 * Initialize popover behavior on mount - 1:1 port of Basecoat popover.js
 */
const initPopover = (popoverComponent: HTMLDivElement) => {
    const trigger = popoverComponent.querySelector(':scope > button') as HTMLButtonElement;
    const content = popoverComponent.querySelector(':scope > [data-popover]') as HTMLElement;

    if (!trigger || !content) {
        const missing: string[] = [];
        if (!trigger) missing.push('trigger');
        if (!content) missing.push('content');
        console.error(`Popover initialisation failed. Missing element(s): ${missing.join(', ')}`, popoverComponent);
        return;
    }

    const rootId = popoverComponent.id || `popover-${Math.random().toString(36).slice(2, 9)}`;
    if (!popoverComponent.id) {
        popoverComponent.id = rootId;
    }
    if (!trigger.id) {
        trigger.id = `${rootId}-trigger`;
    }
    if (!content.id) {
        content.id = `${rootId}-popover`;
    }
    trigger.setAttribute("aria-controls", content.id);
    content.setAttribute("aria-labelledby", trigger.id);

    const closePopover = (focusOnTrigger = true) => {
        if (trigger.getAttribute('aria-expanded') === 'false') return;
        trigger.setAttribute('aria-expanded', 'false');
        content.setAttribute('aria-hidden', 'true');
        if (focusOnTrigger) {
            trigger.focus();
        }
    };

    const openPopover = () => {
        document.dispatchEvent(new CustomEvent('basecoat:popover', {
            detail: { source: popoverComponent }
        }));

        const elementToFocus = content.querySelector('[autofocus]') as HTMLElement;
        if (elementToFocus) {
            content.addEventListener('transitionend', () => {
                elementToFocus.focus();
            }, { once: true });
        }

        trigger.setAttribute('aria-expanded', 'true');
        content.setAttribute('aria-hidden', 'false');
    };

    trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        if (isExpanded) {
            closePopover();
        } else {
            openPopover();
        }
    });

    popoverComponent.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closePopover();
        }
    });

    document.addEventListener('click', (event) => {
        if (!popoverComponent.contains(event.target as Node)) {
            closePopover();
        }
    });

    document.addEventListener('basecoat:popover', ((event: CustomEvent) => {
        if (event.detail.source !== popoverComponent) {
            closePopover(false);
        }
    }) as EventListener);

    (popoverComponent as any).dataset.popoverInitialized = true;
    popoverComponent.dispatchEvent(new CustomEvent('basecoat:initialized'));
};

export const Popover: FC<PopoverProps> = ({ id, className, children, ...props }) => {
    const popoverRef = createRef<HTMLDivElement>();

    return (
        <div
            ref={popoverRef}
            id={id}
            class={cn("popover", className)}
            onMount={() => initPopover(popoverRef.current!)}
            {...props}
        >
            {children}
        </div>
    );
};

export const PopoverTrigger: FC<PopoverTriggerProps> = ({ id, className, children, ...props }) => {
    return (
        <button
            {...props}
            id={id}
            type="button"
            aria-expanded="false"
            class={cn(className)}
        >
            {children}
        </button>
    );
};

export const PopoverContent: FC<PopoverContentProps> = ({ id, className, children, ...props }) => {
    return (
        <div
            {...props}
            id={id}
            data-popover=""
            aria-hidden="true"
            aria-labelledby={id ? id.replace("-popover", "-trigger") : undefined}
            class={cn(className)}
        >
            {children}
        </div>
    );
};
