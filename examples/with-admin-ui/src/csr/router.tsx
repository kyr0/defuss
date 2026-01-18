import {
  changeLanguage,
  loadLanguage,
  Redirect,
  Route,
  RouterSlot,
} from "defuss";
import { LoginScreen } from "./screens/login";
import { DashboardScreen } from "./screens/dashboard";
import { UsersScreen } from "./screens/users";
import { TenantsScreen } from "./screens/tenants";
import { ApiKeysScreen } from "./screens/api-keys";
import { PreAuthLayout } from "./layouts/pre-auth";

import de from "../../i18n/de.json";
import en from "../../i18n/en.json";

export function RouterOutlet() {
  const isLoggedIn = !!window.$APP_PROPS?.user;

  return (
    <>
      {/* Redirect to dashboard if logged in and accessing root */}
      {isLoggedIn && <Redirect path="/" exact={true} to="/dashboard" />}

      {/* Pre-auth: Login page */}
      <Route path="/">
        <PreAuthLayout>
          <LoginScreen />
        </PreAuthLayout>
      </Route>

      {/* Admin routes */}
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

      {/* Redirect to login if not logged in and accessing protected routes */}
      {!isLoggedIn && <Redirect path="/dashboard" to="/" />}
      {!isLoggedIn && <Redirect path="/users" to="/" />}
      {!isLoggedIn && <Redirect path="/tenants" to="/" />}
      {!isLoggedIn && <Redirect path="/api-keys" to="/" />}
    </>
  );
}

export function Router() {
  loadLanguage("de", de);
  loadLanguage("en", en);
  changeLanguage("en");

  return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
