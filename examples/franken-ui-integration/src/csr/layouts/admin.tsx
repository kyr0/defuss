import { createRef, $, type Props, type VNode, Router } from "defuss";
import { Icon, Avatar } from "../../cl";
import { setHeaders } from "defuss-rpc/client.js";
import { SidebarNav, type NavItem } from "../components/sidebar-nav";

export interface AdminLayoutProps extends Props {
    children?: VNode;
}

const navItems: NavItem[] = [
    { label: "Dashboard", icon: "layout-dashboard", href: "/dashboard" },
    { label: "Users", icon: "users", href: "/users" },
    { label: "Tenants", icon: "building-2", href: "/tenants" },
    { label: "API Keys", icon: "key", href: "/api-keys" },
];

// Restore auth from sessionStorage on page load
const restoreAuth = () => {
    if (typeof window === "undefined") return;

    const token = sessionStorage.getItem("auth_token");
    const userStr = sessionStorage.getItem("auth_user");

    if (token && userStr && !window.$APP_PROPS?.token) {
        try {
            const user = JSON.parse(userStr);
            window.$APP_PROPS = {
                user,
                tenant: null,
                token,
            };
            setHeaders({ Authorization: `Bearer ${token}` });
        } catch (e) {
            console.error("Failed to restore auth:", e);
        }
    }
};

export function AdminLayout({ children }: AdminLayoutProps) {
    const sidebarRef = createRef<HTMLDivElement>();
    const mobileMenuRef = createRef<HTMLDivElement>();
    let sidebarCollapsed = false;

    // Restore auth on mount
    restoreAuth();

    const toggleSidebar = () => {
        sidebarCollapsed = !sidebarCollapsed;
        rerenderSidebar();
    };

    const rerenderSidebar = () => {
        const currentPath = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
        $(sidebarRef).update(
            <SidebarNav
                items={navItems}
                currentPath={currentPath}
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
            />
        );
    };

    const toggleMobileMenu = () => {
        const el = mobileMenuRef.current as HTMLElement;
        if (el) {
            el.classList.toggle("hidden");
        }
    };

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/dashboard";

    const handleLogout = () => {
        // Clear session
        window.$APP_PROPS = null;
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_user");
        setHeaders({});
        Router.navigate("/");
    };

    const userName = window.$APP_PROPS?.user?.name || "Admin";
    const userEmail = window.$APP_PROPS?.user?.email || "admin@example.com";

    return (
        <div className="flex w-full bg-background overflow-hidden">
            {/* Desktop Sidebar */}
            <div className="hidden lg:flex" ref={sidebarRef}>
                <SidebarNav
                    items={navItems}
                    currentPath={currentPath}
                    collapsed={sidebarCollapsed}
                    onToggle={toggleSidebar}
                />
            </div>

            {/* Mobile Menu Overlay */}
            <div
                ref={mobileMenuRef}
                className="hidden fixed inset-0 z-50 lg:hidden"
            >
                <div className="absolute inset-0 bg-black/50 cursor-pointer" onClick={toggleMobileMenu} />
                <div className="absolute left-0 top-0 bottom-0 w-64 bg-card shadow-xl">
                    <SidebarNav items={navItems} currentPath={currentPath} onToggle={toggleMobileMenu} />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full h-full flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 flex items-center justify-between px-4 border-b border-border bg-card shrink-0">
                    {/* Mobile Menu Button */}
                    <button
                        onClick={toggleMobileMenu}
                        className="p-2 rounded-md hover:bg-accent lg:hidden cursor-pointer"
                        aria-label="Open menu"
                    >
                        <Icon icon="menu" height={20} width={20} />
                    </button>

                    {/* Mobile Logo */}
                    <a href="/dashboard" className="flex items-center gap-2 lg:hidden">
                        <img src="/defuss_mascott.png" width="32" height="32" alt="defuss" />
                        <span className="font-semibold">defuss</span>
                    </a>

                    {/* Spacer for desktop */}
                    <div className="hidden lg:block flex-1" />

                    {/* Right side actions */}
                    <div className="flex items-center gap-2">
                        {/* Theme Switcher */}
                        <div className="relative">
                            <button
                                className="p-2 rounded-md hover:bg-accent flex items-center justify-center w-9 h-9 cursor-pointer"
                                type="button"
                                aria-label="Toggle theme"
                            >
                                <span className="dark:hidden">
                                    <Icon icon="sun" height={18} width={18} />
                                </span>
                                <span className="hidden dark:inline">
                                    <Icon icon="moon" height={18} width={18} />
                                </span>
                            </button>
                            <div
                                className="uk-drop uk-dropdown min-w-52"
                                data-uk-dropdown="mode: click; pos: bottom-right"
                            >
                                <uk-theme-switcher>
                                    <select hidden>
                                        <optgroup data-key="mode" label="Mode">
                                            <option data-icon="sun" value="light">Light</option>
                                            <option data-icon="moon" value="dark">Dark</option>
                                        </optgroup>
                                        <optgroup data-key="theme" label="Theme">
                                            <option data-hex="#52525b" value="uk-theme-zinc">Zinc</option>
                                            <option data-hex="#2563eb" value="uk-theme-blue">Blue</option>
                                            <option data-hex="#16a34a" value="uk-theme-green">Green</option>
                                            <option data-hex="#7c3aed" value="uk-theme-violet">Violet</option>
                                        </optgroup>
                                    </select>
                                </uk-theme-switcher>
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="relative">
                            <button className="flex items-center gap-2 p-1 rounded-md hover:bg-accent cursor-pointer" type="button">
                                <Avatar
                                    initials={userName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                                    rounded
                                    className="w-8 h-8 bg-primary text-primary-foreground text-sm"
                                />
                                <span className="hidden md:block text-sm font-medium max-w-[120px] truncate">
                                    {userName}
                                </span>
                                <Icon icon="chevron-down" height={14} width={14} className="hidden md:block" />
                            </button>
                            <div
                                className="uk-drop uk-dropdown min-w-48"
                                data-uk-dropdown="mode: click; pos: bottom-right"
                            >
                                <ul className="uk-nav uk-dropdown-nav">
                                    <li className="uk-nav-header text-xs truncate select-none">
                                        {userEmail}
                                    </li>
                                    <li className="uk-nav-divider" />
                                    <li>
                                        <a href="#" onClick={(e) => { e.preventDefault(); }} className="cursor-pointer">
                                            <Icon icon="user" height={16} width={16} className="mr-2" />
                                            Profile
                                        </a>
                                    </li>
                                    <li>
                                        <a href="#" onClick={(e) => { e.preventDefault(); }} className="cursor-pointer">
                                            <Icon icon="settings" height={16} width={16} className="mr-2" />
                                            Settings
                                        </a>
                                    </li>
                                    <li className="uk-nav-divider" />
                                    <li>
                                        <a href="#" onClick={(e) => { e.preventDefault(); handleLogout(); }} className="cursor-pointer">
                                            <Icon icon="log-out" height={16} width={16} className="mr-2" />
                                            Logout
                                        </a>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
