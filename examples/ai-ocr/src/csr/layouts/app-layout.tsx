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
					<div class="flex items-center gap-3">
						<img src="/defuss_mascott.png" width="32" height="32" alt={t("navigation.brand_name")} />
						<span class="text-lg font-semibold">{t("navigation.brand_name")}</span>
					</div>
					<div class="flex items-center gap-3">
						<LanguageSwitcher />
						<ThemeSwitcher />
						<button
							type="button"
							class="btn-outline h-8 px-3 text-sm"
							onClick={handleLogout}
						>
							{t("navigation.logout")}
						</button>
					</div>
				</header>

				<main class="flex-1 overflow-y-auto p-6 md:p-10">
					<div class="mx-auto max-w-2xl admin-page-enter">
						{children}
					</div>
				</main>
			</div>
			<Toaster />
		</>
	);
};
