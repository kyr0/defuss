import { Redirect, Route, RouterSlot } from "defuss";
import { LoginScreen } from "./screens/login";
import { ChatScreen } from "./screens/chat";
import { PreAuthLayout } from "./layouts/pre-auth";
import { AppLayout } from "./layouts/app-layout";
import {
	chatStore,
	loadConversationsFromStorage,
	loadSettingsFromStorage,
} from "./lib/chat-store";
import { initI18n } from "./i18n";

// Initialize i18n
initI18n();

// Restore persisted state
const settings = loadSettingsFromStorage();
chatStore.set({ ...chatStore.value, settings });
loadConversationsFromStorage();

export function RouterOutlet() {
	const isLoggedIn = !!window.$APP_PROPS?.user;

	return (
		<>
			{isLoggedIn && <Redirect path="/" exact={true} to="/chat" />}

			<Route path="/" component={LoginRoute} />
			<Route path="/chat" component={ChatRoute} />

			{!isLoggedIn && <Redirect path="/chat" to="/" />}
		</>
	);
}

function LoginRoute() {
	return (
		<PreAuthLayout>
			<LoginScreen />
		</PreAuthLayout>
	);
}

function ChatRoute() {
	return (
		<AppLayout>
			<ChatScreen />
		</AppLayout>
	);
}

export function App() {
	return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
