import "./styles.js";
import { $, Route, Redirect, RouterSlot } from "defuss";
import { render } from "defuss/client";
import { Page } from "./pages/Page.js";
import { Menu } from "./components/Menu.js";

function RouterOutlet() {
  console.log("RouterOutlet called");
  return (
    <>
      <Redirect path="/" exact={true} to="/home" />

      <Route path="/home">
        <Page name="Home" />
      </Route>

      <Route path="/list">
        <Page name="List" />
      </Route>
    </>
  );
}

function App() {
  return (
    <ion-app onMount={() => $("*").addClass("hydrated")}>
      <ion-split-pane contentId="main">
        {/* the menu renders the menu entries for some or all <Route />'s */}
        <Menu />

        {/* client-side routing (pages) are rendered here - the RouterOutlet is passed by reference, because it runs delayed later */}
        <RouterSlot
          tag="ion-content"
          RouterOutlet={RouterOutlet}
          // default transitionConfig
          transitionConfig={{
            delay: 0, // delay before the transition starts, in ms
            easing: "linear", // default easing function, can also be "linear", "ease-in", "ease-out", or complex
            type: "slide-right", // default transition type: "fade", can also be "slide-left", "slide-right", "shake"
            duration: 150, // set to > 200ms for slide-left etc.; > 400ms for shake
            target: "self", // can also be "parent" to apply the transition to the parent element
          }}
        />
      </ion-split-pane>
    </ion-app>
  );
}
// initial render
render(<App />, $("body"));
