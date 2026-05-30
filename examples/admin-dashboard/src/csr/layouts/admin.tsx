import { Router, type Props, type FC } from "defuss";
import { setHeaders } from "defuss-rpc/client.js";
import {
	Avatar,
	Popover,
	PopoverTrigger,
	PopoverContent,
	Sidebar,
	SidebarHeader,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarTrigger,
	Toaster,
} from "defuss-shadcn";
import { ThemeSwitcher } from "../components/theme-switcher";
import { LanguageSwitcher } from "../components/language-switcher";
import {
	DashboardIcon,
	UsersIcon,
	TenantsIcon,
	ApiKeysIcon,
	LiveLogIcon,
	ChevronsUpDownIcon,
	LogOutIcon,
	PanelLeftIcon,
} from "../components/nav-icons";
import { t, type Keys } from "../i18n";

/** Navigation link descriptor. */
interface NavItem {
	/** i18n key path resolved at render time. */
	labelKey: Keys;
	href: string;
	/** Icon molecule component rendered before the label. */
	icon: FC;
}

const navItems: NavItem[] = [
	{ labelKey: "navigation.dashboard", href: "/dashboard", icon: DashboardIcon },
	{ labelKey: "navigation.users", href: "/users", icon: UsersIcon },
	{ labelKey: "navigation.tenants", href: "/tenants", icon: TenantsIcon },
	{ labelKey: "navigation.api_keys", href: "/api-keys", icon: ApiKeysIcon },
	{ labelKey: "navigation.live_log", href: "/live-log", icon: LiveLogIcon },
];

const restoreAuth = () => {
	if (typeof window === "undefined") return;
	const token = sessionStorage.getItem("auth_token");
	const userStr = sessionStorage.getItem("auth_user");

	if (token && userStr && !window.$APP_PROPS?.token) {
		try {
			const user = JSON.parse(userStr);
			window.$APP_PROPS = { user, tenant: null, token };
			setHeaders({ Authorization: `Bearer ${token}` });
		} catch (error) {
			console.error("Failed to restore auth:", error);
		}
	}
};

const logout = () => {
	window.$APP_PROPS = null;
	sessionStorage.removeItem("auth_token");
	sessionStorage.removeItem("auth_user");
	setHeaders({});
	Router.navigate("/");
};

/** Main admin layout with collapsible sidebar, header, and theme controls. */
export const AdminLayout = ({ children, ...props }: Props & { onMount?: () => void; onUnmount?: () => void }) => {
	restoreAuth();
	const currentPath = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
	const userName = window.$APP_PROPS?.user?.name || t("navigation.admin_footer");
	const userInitials = userName
		.split(" ")
		.map((n) => n[0])
		.slice(0, 2)
		.join("")
		.toUpperCase();

	const avatarUrl = "https://avatars.githubusercontent.com/u/454817?v=4&size=64";

	return (
		<div class="min-h-svh bg-background text-foreground h-screen overflow-hidden" {...props}>
			<Sidebar id="admin-sidebar" className="sidebar-fixed" initialOpen>
				<SidebarHeader className="p-3 border-b h-12">
					<div class="flex items-center justify-between gap-2">
						<a href="/dashboard" class="flex items-center gap-2" onClick={(e) => { e.preventDefault(); Router.navigate('/dashboard'); }}>
							<img src="/defuss_mascott.png" width="28" height="28" alt="defuss" />
							<span class="font-semibold">{t("navigation.brand_name")}</span>
						</a>
					</div>
				</SidebarHeader>
				<SidebarContent className="p-2 h-full overflow-y-auto">
					<SidebarGroup>
						<SidebarGroupLabel className="px-2 py-1.5 text-xs text-muted-foreground">{t("navigation.navigation_label")}</SidebarGroupLabel>
						<SidebarMenu>
							{navItems.map((item) => {
								const Icon = item.icon;
								const active = currentPath === item.href;
								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											href={item.href}
											isActive={active}
											onClick={(e) => {
												e.preventDefault();
												Router.navigate(item.href);
											}}
											className={`cursor-pointer px-2 py-2 gap-2 ${active ? "bg-sidebar-accent font-semibold" : ""}`}
										>
											<span class="[&_svg]:size-4 shrink-0"><Icon /></span>
											<span>{t(item.labelKey)}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroup>
				</SidebarContent>
				<SidebarFooter className="border-t p-2">
					<Popover id="sidebar-user-popover">
						<PopoverTrigger
							className="btn-ghost p-2 h-12 w-full flex items-center justify-start gap-2"
							data-keep-mobile-sidebar-open=""
						>
							<Avatar src={avatarUrl} alt={userName} className="size-8 rounded-lg" />
							<div class="grid flex-1 text-left text-sm leading-tight">
								<span class="truncate font-medium">{userName}</span>
							</div>
							<ChevronsUpDownIcon />
						</PopoverTrigger>
						<PopoverContent className="w-56" data-side="top" data-align="end">
							<div class="grid gap-3">
								<header class="flex items-center gap-2 p-1">
									<Avatar src={avatarUrl} alt={userName} className="size-8 rounded-lg" />
									<div class="grid text-left text-sm leading-tight">
										<span class="truncate font-medium">{userName}</span>
									</div>
								</header>
								<hr class="border-border" />
								<button
									type="button"
									class="btn-ghost w-full justify-start gap-2 px-2 py-1.5 text-sm"
									onClick={logout}
								>
									<LogOutIcon />
									{t("navigation.logout")}
								</button>
							</div>
						</PopoverContent>
					</Popover>
				</SidebarFooter>
			</Sidebar>

			<div class="h-full flex flex-col overflow-y-auto scrollbar">
				<header class="admin-header-blur h-12 shrink-0 border-b px-4 flex items-center justify-between sticky top-0 z-10">
					<div class="flex items-center gap-2">
						<SidebarTrigger sidebarId="admin-sidebar" className="btn-icon-outline size-8" aria-label={t("navigation.open_sidebar")}>
							<PanelLeftIcon />
						</SidebarTrigger>
					</div>

					<div class="flex items-center gap-2">
						<LanguageSwitcher />
						<ThemeSwitcher />
					</div>
				</header>

				<main class="flex-1 p-6 admin-page-enter">{children}</main>
			</div>
			<Toaster />
		</div>
	);
};
