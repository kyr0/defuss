import { createRef, Router, type VNode } from "defuss";
import { Icon } from "../../cl";

export interface NavItem {
    label: string;
    icon: string;
    href: string;
    badge?: string | number;
}

export interface SidebarNavProps {
    items: NavItem[];
    currentPath: string;
    collapsed?: boolean;
    onToggle?: () => void;
}

export const SidebarNav = ({
    items,
    currentPath,
    collapsed = false,
    onToggle,
}: SidebarNavProps) => {
    const handleNavClick = (href: string, e: MouseEvent) => {
        e.preventDefault();
        Router.navigate(href);
    };

    return (
        <aside
            className={`flex flex-col bg-card border-r border-border transition-all duration-300 ${collapsed ? "w-16" : "w-64"
                }`}
        >
            {/* Logo and Toggle */}
            <div className="flex items-center justify-between h-16 px-4 border-b border-border">
                {!collapsed && (
                    <a href="/dashboard" className="flex items-center gap-2">
                        <img src="/defuss_mascott.png" width="32" height="32" alt="defuss" />
                        <span className="font-semibold text-lg">defuss</span>
                    </a>
                )}
                {collapsed && (
                    <a href="/dashboard" className="mx-auto">
                        <img src="/defuss_mascott.png" width="32" height="32" alt="defuss" />
                    </a>
                )}
                <button
                    onClick={onToggle}
                    className="p-2 rounded-md hover:bg-accent transition-colors lg:flex hidden"
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    <Icon icon={collapsed ? "chevrons-right" : "chevrons-left"} height={18} width={18} />
                </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 py-4 overflow-y-auto">
                <ul className="space-y-1 px-2">
                    {items.map((item) => {
                        const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
                        return (
                            <li key={item.href}>
                                <a
                                    href={item.href}
                                    onClick={(e) => handleNavClick(item.href, e)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive
                                            ? "bg-primary text-primary-foreground"
                                            : "hover:bg-accent text-foreground"
                                        }`}
                                    title={collapsed ? item.label : undefined}
                                >
                                    <Icon icon={item.icon} height={20} width={20} />
                                    {!collapsed && (
                                        <>
                                            <span className="flex-1">{item.label}</span>
                                            {item.badge !== undefined && (
                                                <span className="px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
                                                    {item.badge}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
};
