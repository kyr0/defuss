import { Router } from "defuss";

export function HomeScreen() {
  return (
    <div data-name="home" class="page">
      <div class="navbar">
        <div class="navbar-bg"></div>
        <div class="navbar-inner">
          <div class="title">defusscapacitor</div>
        </div>
      </div>

      <div class="page-content">
        <p>
          This project demonstrates how to build a native iOS and Android App
          with Capacitor using Defuss.
        </p>
        <p>The UI is based on Framework7 styles (Tailwind).</p>
        <button
          type="button"
          class="button"
          onClick={() => Router.navigate("/native")}
        >
          Native Features
        </button>
      </div>
    </div>
  );
}
