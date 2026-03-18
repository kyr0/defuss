import { Redirect, Route, RouterSlot } from "defuss";
import { LoginScreen } from "./screens/login";
import { DashboardScreen } from "./screens/dashboard";
import { UsersScreen } from "./screens/users";
import { TenantsScreen } from "./screens/tenants";
import { ApiKeysScreen } from "./screens/api-keys";
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

      <Route path="/dashboard">
        <DashboardScreen />
      </Route>

      <Route path="/users">
        <UsersScreen />
      </Route>

      <Route path="/tenants">
        <TenantsScreen />
      </Route>

      <Route path="/api-keys">
        <ApiKeysScreen />
      </Route>

      {!isLoggedIn && <Redirect path="/dashboard" to="/" />}
      {!isLoggedIn && <Redirect path="/users" to="/" />}
      {!isLoggedIn && <Redirect path="/tenants" to="/" />}
      {!isLoggedIn && <Redirect path="/api-keys" to="/" />}
    </>
  );
}

/** Root application component that mounts the client-side router. */
export function App() {
  return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
