import {
  changeLanguage,
  loadLanguage,
  Redirect,
  Route,
  RouterSlot,
} from "defuss";
import { LoginScreen } from "./screens/login";
import { DashboardScreen } from "./screens/dashboard";
import { PreAuthLayout } from "./layouts/pre-auth";

import de from "../../i18n/de.json";
import en from "../../i18n/en.json";

export function RouterOutlet() {
  const isLoggedIn = !!window.$APP_PROPS?.user;

  return (
    <>
      {isLoggedIn && <Redirect path="/" exact={true} to="/dashboard" />}

      <Route path="/">
        <PreAuthLayout>
          <LoginScreen news={[]} />
        </PreAuthLayout>
      </Route>

      <Route path="/dashboard">
        <DashboardScreen />
      </Route>

      {!isLoggedIn && <Redirect path="/dashboard" exact={true} to="/" />}
    </>
  );
}

export function Router() {
  loadLanguage("de", de);
  loadLanguage("en", en);
  changeLanguage("en");

  return <RouterSlot tag="div" RouterOutlet={RouterOutlet} />;
}
