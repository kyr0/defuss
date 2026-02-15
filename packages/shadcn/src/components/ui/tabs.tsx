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
    const getPanelForTab = (tab: HTMLButtonElement) => {
        const value = tab.dataset.value;
        if (!value) return null;
        return tabsComponent.querySelector(`[role="tabpanel"][data-value="${value}"]`) as HTMLElement | null;
    };

    const selectTab = (tabToSelect: HTMLButtonElement) => {
        tabs.forEach((tab) => {
            tab.setAttribute('aria-selected', 'false');
            tab.setAttribute('tabindex', '-1');
            const panel = getPanelForTab(tab);
            if (panel) panel.hidden = true;
        });

        tabToSelect.setAttribute('aria-selected', 'true');
        tabToSelect.setAttribute('tabindex', '0');
        const activePanel = getPanelForTab(tabToSelect);
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

        const tabsRoot = tabsRef.current;
        const instanceId = tabsRoot.id || `tabs-${Math.random().toString(36).slice(2, 9)}`;
        if (!tabsRoot.id) {
            tabsRoot.id = instanceId;
        }

        const tablist = tabsRoot.querySelector('[role="tablist"]') as HTMLElement | null;
        const tabs = tablist
            ? Array.from(tablist.querySelectorAll('[role="tab"]')) as HTMLButtonElement[]
            : [];

        tabs.forEach((tab, index) => {
            const value = tab.dataset.value;
            if (!value) return;

            const panel = tabsRoot.querySelector(`[role="tabpanel"][data-value="${value}"]`) as HTMLElement | null;
            const tabId = `${instanceId}-tab-${index}`;
            const panelId = `${instanceId}-panel-${index}`;

            tab.id = tabId;
            if (panel) {
                panel.id = panelId;
                tab.setAttribute('aria-controls', panelId);
                panel.setAttribute('aria-labelledby', tabId);
            }
        });

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
            data-value={value}
            tabIndex={-1}
            hidden
            class={cn(className)}
            {...props}
        >
            {children}
        </div>
    );
};
