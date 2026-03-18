import { Router, type Props } from "defuss";
import { setHeaders } from "defuss-rpc/client.js";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { t, type Keys } from "../i18n";

/** Navigation link descriptor. */
interface NavItem {
  /** i18n key path resolved at render time. */
  labelKey: Keys;
  href: string;
}

const navItems: NavItem[] = [
  { labelKey: "navigation.dashboard", href: "/dashboard" },
  { labelKey: "navigation.users", href: "/users" },
  { labelKey: "navigation.tenants", href: "/tenants" },
  { labelKey: "navigation.api_keys", href: "/api-keys" },
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
export const AdminLayout = ({ children }: Props) => {
  restoreAuth();
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "/dashboard";
  const userName = window.$APP_PROPS?.user?.name || t("navigation.admin_footer");

  return (
    <div class="min-h-svh bg-background text-foreground">
      <Sidebar id="admin-sidebar" className="sidebar-fixed" initialOpen>
        <SidebarHeader className="p-3 border-b">
          <div class="flex items-center justify-between gap-2">
            <a href="/dashboard" class="flex items-center gap-2" onClick={(e) => { e.preventDefault(); Router.navigate('/dashboard'); }}>
              <img src="/defuss_mascott.png" width="28" height="28" alt="defuss" />
              <span class="font-semibold">{t("navigation.brand_name")}</span>
            </a>
            <SidebarTrigger sidebarId="admin-sidebar" className="btn-icon-outline size-8" aria-label={t("navigation.close_sidebar")}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-panel-left-close"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M9 3v18" />
                <path d="m16 15-3-3 3-3" />
              </svg>
            </SidebarTrigger>
          </div>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarGroup>
            <SidebarGroupLabel className="px-2 py-1.5 text-xs text-muted-foreground">{t("navigation.navigation_label")}</SidebarGroupLabel>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    href={item.href}
                    isActive={currentPath === item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      Router.navigate(item.href);
                    }}
                    className="cursor-pointer px-2 py-2"
                  >
                    {t(item.labelKey)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter className="p-3 border-t text-xs text-muted-foreground">{t("navigation.admin_footer")}</SidebarFooter>
      </Sidebar>

      <div class="min-h-svh flex flex-col">
        <header class="h-16 border-b px-4 flex items-center justify-between bg-card">
          <div class="flex items-center gap-2">
            <SidebarTrigger sidebarId="admin-sidebar" className="btn-outline">{t("navigation.menu")}</SidebarTrigger>
            <h1 class="text-sm font-medium">{t("navigation.admin_panel")}</h1>
          </div>

          <div class="flex items-center gap-2">
            <ThemeSwitcher />
            <DropdownMenu>
              <DropdownMenuTrigger className="btn-sm-outline">{userName}</DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={logout} className="cursor-pointer">{t("navigation.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main class="flex-1 p-6">{children}</main>
      </div>
      <Toaster />
    </div>
  );
};
