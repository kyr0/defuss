import { Redirect, Route, RouterSlot } from "defuss";
import { LoginScreen } from "./screens/login";
import { DashboardScreen } from "./screens/dashboard";
import { UsersScreen } from "./screens/users";
import { TenantsScreen } from "./screens/tenants";
import { ApiKeysScreen } from "./screens/api-keys";
import { LiveLogScreen } from "./screens/live-log";
import { PreAuthLayout } from "./layouts/pre-auth";
import { initI18n } from "./i18n";

initI18n();

/** Determines authenticated vs. unauthenticated route tree. */
export function RouterOutlet() {
	const isLoggedIn = !!window.$APP_PROPS?.user;

	return (
		<>
			{isLoggedIn && <Redirect path="/" exact={true} to="/dashboard" />}

			<Route path="/">
				<PreAuthLayout>
					<LoginScreen />
				</PreAuthLayout>
			</Route>

			<Route path="/dashboard" component={DashboardScreen} />
			<Route path="/users" component={UsersScreen} />
			<Route path="/tenants" component={TenantsScreen} />
			<Route path="/api-keys" component={ApiKeysScreen} />
			<Route path="/live-log" component={LiveLogScreen} />

			{!isLoggedIn && <Redirect path="/dashboard" to="/" />}
			{!isLoggedIn && <Redirect path="/users" to="/" />}
			{!isLoggedIn && <Redirect path="/tenants" to="/" />}
			{!isLoggedIn && <Redirect path="/api-keys" to="/" />}
			{!isLoggedIn && <Redirect path="/live-log" to="/" />}
		</>
	);
}

/** Root application component that mounts the client-side router. */
export function App() {
	return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
