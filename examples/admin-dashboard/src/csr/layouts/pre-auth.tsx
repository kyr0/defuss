import { type Props } from "defuss";
import { Separator, Toaster } from "defuss-shadcn";
import { ThemeSwitcher } from "../components/theme-switcher";
import { LanguageSwitcher } from "../components/language-switcher";
import { t } from "../i18n";

/** Pre-authentication page layout with brand header and decorative side panel. */
export const PreAuthLayout = ({ children }: Props) => {
	return (
		<>
			<div class="grid h-svh overflow-hidden lg:grid-cols-2">
				<div class="flex flex-col gap-4 p-6 md:p-10 overflow-y-auto">
					<div class="flex justify-between">
						<a href="/" class="flex items-center gap-2">
							<img src="/defuss_mascott.png" width="48" height="48" alt={t("navigation.brand_name")} />
							<span class="text-lg font-semibold">{t("navigation.brand_name")}</span>
						</a>
						<div class="flex items-center gap-2">
							<LanguageSwitcher />
							<ThemeSwitcher />
						</div>
					</div>
					<div class="flex flex-1 items-center justify-center">{children}</div>
				</div>

				<div class="relative hidden overflow-hidden lg:block">
					{/* Layered background: primary gradient + dark overlay for text contrast */}
					<div class="absolute inset-0 bg-primary" />
					<div class="absolute inset-0 bg-gradient-to-br from-primary via-primary/80 to-primary/60" />
					<div class="absolute inset-0 bg-black/40 dark:bg-black/60" />

					{/* Animated accent orbs */}
					<div class="pre-auth-orb pre-auth-orb-1" />
					<div class="pre-auth-orb pre-auth-orb-2" />
					<div class="pre-auth-orb pre-auth-orb-3" />

					{/* Subtle texture */}
					<div class="absolute inset-0 opacity-[0.03]" style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cpath d=&quot;M0 60L60 0H40L0 40zM20 60L60 20V0L0 60zM60 40L40 60h20z&quot; fill=&quot;%23fff&quot;/%3E%3C/svg%3E'); background-size: 60px 60px;" />

					{/* Bottom fade */}
					<div class="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

					{/* Content */}
					<div class="pre-auth-content relative flex h-full flex-col items-center justify-center gap-8 p-12 text-white">
						<img src="/defuss_mascott.png" width="96" height="96" alt={t("navigation.brand_name")} class="drop-shadow-2xl" />
						<blockquote class="max-w-md text-center">
							<p class="text-lg font-medium leading-relaxed text-white/90">{t("login.promo_quote")}</p>
							<Separator className="mx-auto my-4 w-12 bg-white/25" />
							<footer class="text-sm font-semibold text-white/60">{t("navigation.brand_name")}</footer>
						</blockquote>
					</div>
				</div>
			</div>
			<Toaster />
		</>
	);
};
