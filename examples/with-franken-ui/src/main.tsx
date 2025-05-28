/* Theme variables */
import "./theme/variables.css";
import "uikit";
import "franken-ui/js/core.iife";
import "franken-ui/js/icon.iife";
import {
  $,
  Route,
  Redirect,
  RouterSlot,
  type ParentElementInput,
} from "defuss";
import { render } from "defuss/client";
import { LoginPage } from "./pages/LoginPage.js";

function RouterOutlet() {
  return (
    <>
      <Redirect path="/" exact={true} to="/login" />

      <Route path="/login">
        <LoginPage />
      </Route>
    </>
  );
}

function App() {
  return (
    <div>
      <RouterSlot tag="ion-content" RouterOutlet={RouterOutlet} />
    </div>
  );
}

// initial render
render(<App />, $("body") as ParentElementInput);
