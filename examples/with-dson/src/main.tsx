import { Repl } from "./components/Repl";
import "./styles/reset.css";
import "./styles/palette.css";
import "./styles/squeezy.css";
import "./styles/style.css";

import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { $ } from "defuss";
import { render } from "defuss/client";

function App() {
  return (
    // fragments work
    <>
      <div class="pt-lg vbox justify-center">
        <a href="https://vite.dev" target="_blank" rel="noreferrer">
          {/* class works */}
          <img src={viteLogo} class="logo" alt="Vite logo" />
        </a>
        <a
          href="https://www.github.com/kyr0/defuss"
          target="_blank"
          rel="noreferrer"
        >
          {/* className works too */}
          <img
            src="/defuss_mascott.png"
            className="logo defuss"
            alt="defuss logo"
          />
        </a>
        <a
          href="https://www.typescriptlang.org/"
          target="_blank"
          rel="noreferrer"
        >
          <img
            src={typescriptLogo}
            class="logo vanilla"
            alt="TypeScript logo"
          />
        </a>
      </div>

      <h1>DSON is Definitely Typed JSON</h1>

      <p class="dim">
        Check the console for errors and DSON deserialized output!
      </p>

      <div class="p-lg vbox justify-center">
        <Repl />
      </div>

    </>
  );
}
// initial render
render(<App />, $("#app"));
