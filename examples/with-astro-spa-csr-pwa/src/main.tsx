import {
	Route,
	Redirect,
	RouterSlot,
	loadLanguage,
	changeLanguage,
	type Props,
} from "defuss";
import { HomeScreen } from "./screens/home";
import { TosScreen } from "./screens/tos";
import { LoginScreen } from "./screens/login";
import { SignupScreen } from "./screens/signup";
import { ForgotPasswordScreen } from "./screens/forgot-password";
import { AboutScreen } from "./screens/about";
import { DashboardScreen } from "./screens/dashboard";
import { BottleDetailsScreen } from "./screens/bottle-details";
import { SettingsScreen } from "./screens/settings";
import { HelpScreen } from "./screens/help";
import { ProfileScreen } from "./screens/profile";
import { CreateBottleScreen } from "./screens/create-bottle";

import de from "../i18n/de.json";
import en from "../i18n/en.json";

function RouterOutlet() {
	const isLoggedIn = false; // Replace with actual authentication logic

	return (
		<>
			{isLoggedIn && <Redirect path="/" exact={true} to="/dashboard" />}

			<Route path="/">
				<HomeScreen news={[]} />
			</Route>

			<Route path="/tos">
				<TosScreen />
			</Route>

			<Route path="/privacy-policy">
				<TosScreen />
			</Route>

			<Route path="/login">
				<LoginScreen />
			</Route>

			<Route path="/signup">
				<SignupScreen />
			</Route>

			<Route path="/forgot-password">
				<ForgotPasswordScreen />
			</Route>

			<Route path="/about">
				<AboutScreen />
			</Route>

			<Route path="/dashboard">
				<DashboardScreen />
			</Route>

			<Route path="/bottle-details">
				<BottleDetailsScreen />
			</Route>

			<Route path="/settings">
				<SettingsScreen />
			</Route>

			<Route path="/help">
				<HelpScreen />
			</Route>

			<Route path="/profile">
				<ProfileScreen />
			</Route>

			<Route path="/create-bottle">
				<CreateBottleScreen />
			</Route>
		</>
	);
}

export interface AppProps extends Props {
	[astroProps: string]: unknown;
}

export function App({ featureCards }: AppProps) {
	loadLanguage("de", de);
	loadLanguage("en", en);
	changeLanguage("de");

	return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
