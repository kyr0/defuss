import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type TabsProps = ElementProps<HTMLDivElement> & {
    defaultValue?: string;
};

export type TabsListProps = ElementProps<HTMLElement>;
export type TabsTriggerProps = ElementProps<HTMLButtonElement> & {
    value: string;
};
export type TabsContentProps = ElementProps<HTMLDivElement> & {
    value: string;
};

/**
 * Initialize tabs behavior on mount - 1:1 port of Basecoat tabs.js
 */
const initTabs = (tabsComponent: HTMLDivElement) => {
    const tablist = tabsComponent.querySelector('[role="tablist"]') as HTMLElement;
    if (!tablist) return;

    const tabs = Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLButtonElement[];
    const panels = tabs.map(tab =>
        document.getElementById(tab.getAttribute('aria-controls') || '')
    ).filter(Boolean) as HTMLElement[];

    const selectTab = (tabToSelect: HTMLButtonElement) => {
        tabs.forEach((tab, index) => {
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
            if (panels[index]) panels[index].hidden = true;
        });

        tabToSelect.setAttribute('aria-selected', 'true');
        tabToSelect.setAttribute('tabindex', '0');
        const activePanel = document.getElementById(tabToSelect.getAttribute('aria-controls') || '');
        if (activePanel) activePanel.hidden = false;
    };

    tablist.addEventListener('click', (event) => {
        const clickedTab = (event.target as HTMLElement).closest('[role="tab"]') as HTMLButtonElement;
        if (clickedTab) selectTab(clickedTab);
    });

    tablist.addEventListener('keydown', (event) => {
        const currentTab = event.target as HTMLButtonElement;
        if (!tabs.includes(currentTab)) return;

        let nextTab: HTMLButtonElement | undefined;
        const currentIndex = tabs.indexOf(currentTab);

        switch (event.key) {
            case 'ArrowRight':
                nextTab = tabs[(currentIndex + 1) % tabs.length];
                break;
            case 'ArrowLeft':
                nextTab = tabs[(currentIndex - 1 + tabs.length) % tabs.length];
                break;
            case 'Home':
                nextTab = tabs[0];
                break;
            case 'End':
                nextTab = tabs[tabs.length - 1];
                break;
            default:
                return;
        }

        event.preventDefault();
        if (nextTab) {
            selectTab(nextTab);
            nextTab.focus();
        }
    });

    (tabsComponent as any).dataset.tabsInitialized = true;
    tabsComponent.dispatchEvent(new CustomEvent('basecoat:initialized'));
};

export const Tabs: FC<TabsProps> = ({ className, defaultValue, children, ...props }) => {
    const tabsRef = createRef<HTMLDivElement>();

    const onMount = () => {
        if (!tabsRef.current) return;
        initTabs(tabsRef.current);

        // Select default tab after initialization
        if (defaultValue) {
            const defaultTab = tabsRef.current.querySelector(`[role="tab"][data-value="${defaultValue}"]`) as HTMLButtonElement;
            if (defaultTab) {
                defaultTab.click();
            }
        } else {
            // Select first tab by default
            const firstTab = tabsRef.current.querySelector('[role="tab"]') as HTMLButtonElement;
            if (firstTab) {
                firstTab.click();
            }
        }
    };

    return (
        <div ref={tabsRef} class={cn("tabs", className)} onMount={onMount} {...props}>
            {children}
        </div>
    );
};

export const TabsList: FC<TabsListProps> = ({ className, children, ...props }) => {
    return (
        <nav
            role="tablist"
            aria-orientation="horizontal"
            class={cn(className)}
            {...props}
        >
            {children}
        </nav>
    );
};

export const TabsTrigger: FC<TabsTriggerProps> = ({ className, value, children, ...props }) => {
    return (
        <button
            role="tab"
            tabIndex={-1}
            aria-selected="false"
            aria-controls={`panel-${value}`}
            data-value={value}
            class={cn(className)}
            {...props}
        >
            {children}
        </button>
    );
};

export const TabsContent: FC<TabsContentProps> = ({ className, value, children, ...props }) => {
    return (
        <div
            role="tabpanel"
            id={`panel-${value}`}
            tabIndex={-1}
            hidden
            class={cn(className)}
            {...props}
        >
            {children}
        </div>
    );
};
