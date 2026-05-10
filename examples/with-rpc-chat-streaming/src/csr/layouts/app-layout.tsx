import { createRef, Router, type Props } from "defuss";
import { setHeaders } from "defuss-rpc/client.js";
import { Toaster } from "defuss-shadcn";
import { ThemeSwitcher } from "../components/theme-switcher";
import { LanguageSwitcher } from "../components/language-switcher";
import { t } from "../i18n";

export const AppLayout = ({ children }: Props) => {
  const containerRef = createRef<HTMLDivElement>();

  const restoreAuth = () => {
    const token = sessionStorage.getItem("auth_token");
    const userJson = sessionStorage.getItem("auth_user");

    if (token && userJson) {
      try {
        const user = JSON.parse(userJson);
        if (!window.$APP_PROPS) {
          window.$APP_PROPS = { user: null, token: null };
        }
        window.$APP_PROPS.user = user;
        window.$APP_PROPS.token = token;
        setHeaders({ Authorization: `Bearer ${token}` });
      } catch {
        sessionStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_user");
        Router.navigate("/");
      }
    } else {
      Router.navigate("/");
    }
  };

  const handleLogout = async () => {
    try {
      const { getRpcClient } = await import("../lib/rpc-client");
      const rpc = await getRpcClient();
      await new rpc.AuthApi().logout();
    } catch {
      // ignore logout errors
    }
    sessionStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_user");
    window.$APP_PROPS = null;
    setHeaders({ Authorization: "" });
    Router.navigate("/");
  };

  return (
    <>
      <div ref={containerRef} class="flex flex-col h-svh" onMount={restoreAuth}>
        <header class="flex items-center justify-between px-4 py-2 border-b bg-background/80 backdrop-blur-sm">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
            <span class="text-sm font-semibold">{t("navigation.brand_name")}</span>
          </div>
          <div class="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <button
              type="button"
              class="btn-icon-ghost size-8 text-muted-foreground hover:text-destructive"
              onClick={handleLogout}
              aria-label={t("navigation.logout")}
              title={t("navigation.logout")}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
            </button>
          </div>
        </header>

        <main class="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
      <Toaster className="toaster" style={{ position: "fixed", bottom: "1rem", right: "1rem", left: "auto", zIndex: 50, pointerEvents: "none" }} data-align="end" />
    </>
  );
};
