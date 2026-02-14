import type { ElementProps, FC } from "defuss";
import { createRef } from "defuss";
import { cn } from "../../utilities/cn.js";

export type SidebarProps = ElementProps<HTMLElement> & {
    id?: string;
    initialOpen?: boolean;
    initialMobileOpen?: boolean;
    breakpoint?: number;
};

export type SidebarTriggerProps = ElementProps<HTMLButtonElement> & {
    sidebarId?: string;
    action?: 'open' | 'close' | 'toggle';
};

export type SidebarContentProps = ElementProps<HTMLElement>;
export type SidebarHeaderProps = ElementProps<HTMLElement>;
export type SidebarFooterProps = ElementProps<HTMLElement>;
export type SidebarGroupProps = ElementProps<HTMLDivElement>;
export type SidebarGroupLabelProps = ElementProps<HTMLDivElement>;
export type SidebarMenuProps = ElementProps<HTMLUListElement>;
export type SidebarMenuItemProps = ElementProps<HTMLLIElement>;
export type SidebarMenuButtonProps = ElementProps<HTMLAnchorElement> & {
    isActive?: boolean;
};

// Monkey patching the history API to detect client-side navigation
if (typeof window !== 'undefined' && !(window.history as any).__basecoatPatched) {
    const originalPushState = window.history.pushState;
    window.history.pushState = function (...args) {
        originalPushState.apply(this, args);
        window.dispatchEvent(new Event('basecoat:locationchange'));
    };

    const originalReplaceState = window.history.replaceState;
    window.history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);
        window.dispatchEvent(new Event('basecoat:locationchange'));
    };

    (window.history as any).__basecoatPatched = true;
}

const initSidebar = (sidebarComponent: HTMLElement) => {
    const initialOpen = (sidebarComponent as any).dataset.initialOpen !== 'false';
    const initialMobileOpen = (sidebarComponent as any).dataset.initialMobileOpen === 'true';
    const breakpoint = parseInt((sidebarComponent as any).dataset.breakpoint) || 768;

    let open = breakpoint > 0
        ? (window.innerWidth >= breakpoint ? initialOpen : initialMobileOpen)
        : initialOpen;

    const updateCurrentPageLinks = () => {
        const currentPath = window.location.pathname.replace(/\/$/, '');
        sidebarComponent.querySelectorAll('a').forEach(link => {
            if (link.hasAttribute('data-ignore-current')) return;
            if (!link.href) return; // Skip links without href
            const rawHref = link.getAttribute('href');
            if (!rawHref) return;
            if (rawHref.startsWith('#')) {
                link.removeAttribute('aria-current');
                return;
            }

            try {
                const linkPath = new URL(link.href).pathname.replace(/\/$/, '');
                if (linkPath === currentPath) {
                    link.setAttribute('aria-current', 'page');
                } else {
                    link.removeAttribute('aria-current');
                }
            } catch (e) {
                // Ignore invalid URLs
            }
        });
    };

    const updateState = () => {
        sidebarComponent.setAttribute('aria-hidden', String(!open));
        if (open) {
            sidebarComponent.removeAttribute('inert');
        } else {
            sidebarComponent.setAttribute('inert', '');
        }
    };

    const setState = (state: boolean) => {
        open = state;
        updateState();
    };

    const sidebarId = sidebarComponent.id;

    document.addEventListener('basecoat:sidebar', ((event: CustomEvent) => {
        if (event.detail?.id && event.detail.id !== sidebarId) return;

        switch (event.detail?.action) {
            case 'open':
                setState(true);
                break;
            case 'close':
                setState(false);
                break;
            default:
                setState(!open);
                break;
        }
    }) as EventListener);

    sidebarComponent.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        const nav = sidebarComponent.querySelector('nav');

        const isMobile = window.innerWidth < breakpoint;

        if (isMobile && (target.closest('a, button') && !target.closest('[data-keep-mobile-sidebar-open]'))) {
            if (document.activeElement) (document.activeElement as HTMLElement).blur();
            setState(false);
            return;
        }

        if (target === sidebarComponent || (nav && !nav.contains(target))) {
            if (document.activeElement) (document.activeElement as HTMLElement).blur();
            setState(false);
        }
    });

    window.addEventListener('popstate', updateCurrentPageLinks);
    window.addEventListener('basecoat:locationchange', updateCurrentPageLinks);

    updateState();
    updateCurrentPageLinks();
    (sidebarComponent as any).dataset.sidebarInitialized = true;
    sidebarComponent.dispatchEvent(new CustomEvent('basecoat:initialized'));
};

export const Sidebar: FC<SidebarProps> = ({
    id,
    className,
    initialOpen = true,
    initialMobileOpen = false,
    breakpoint = 768,
    children,
    ...props
}) => {
    const sidebarRef = createRef<HTMLElement>();

    return (
        <aside
            ref={sidebarRef}
            id={id}
            class={cn("sidebar", className)}
            data-initial-open={String(initialOpen)}
            data-initial-mobile-open={String(initialMobileOpen)}
            data-breakpoint={breakpoint}
            onMount={() => initSidebar(sidebarRef.current!)}
            {...props}
        >
            <nav aria-label="Sidebar navigation">
                {children}
            </nav>
        </aside>
    );
};

export const SidebarTrigger: FC<SidebarTriggerProps> = ({
    className,
    sidebarId,
    action = 'toggle',
    children,
    ...props
}) => {
    const handleClick = () => {
        document.dispatchEvent(new CustomEvent('basecoat:sidebar', {
            detail: { id: sidebarId, action }
        }));
    };

    return (
        <button
            type="button"
            class={cn(className)}
            onClick={handleClick}
            {...props}
        >
            {children}
        </button>
    );
};

export const SidebarContent: FC<SidebarContentProps> = ({ className, children, ...props }) => (
    <section class={cn(className)} {...props}>{children}</section>
);

export const SidebarHeader: FC<SidebarHeaderProps> = ({ className, children, ...props }) => (
    <header class={cn(className)} {...props}>{children}</header>
);

export const SidebarFooter: FC<SidebarFooterProps> = ({ className, children, ...props }) => (
    <footer class={cn(className)} {...props}>{children}</footer>
);

export const SidebarGroup: FC<SidebarGroupProps> = ({ className, children, ...props }) => (
    <div role="group" class={cn(className)} {...props}>{children}</div>
);

export const SidebarGroupLabel: FC<SidebarGroupLabelProps> = ({ className, children, ...props }) => (
    <h3 class={cn(className)} {...props}>{children}</h3>
);

export const SidebarMenu: FC<SidebarMenuProps> = ({ className, children, ...props }) => (
    <ul class={cn(className)} {...props}>{children}</ul>
);

export const SidebarMenuItem: FC<SidebarMenuItemProps> = ({ className, children, ...props }) => (
    <li class={cn(className)} {...props}>{children}</li>
);

export const SidebarMenuButton: FC<SidebarMenuButtonProps> = ({ className, isActive, children, ...props }) => (
    <a
        role="button"

        class={cn(className)}
        aria-current={isActive ? 'page' : undefined}
        {...props}
    >
        {children}
    </a>
);
